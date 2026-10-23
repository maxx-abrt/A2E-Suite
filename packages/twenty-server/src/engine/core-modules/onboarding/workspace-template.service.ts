import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';

import { randomUUID } from 'crypto';

import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { In, type Repository } from 'typeorm';

import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { ApplicationState } from 'src/engine/core-modules/application/enums/application-state.enum';
import { describeApplicationInstallError } from 'src/engine/core-modules/application/application-install/utils/describe-application-install-error.util';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { ApplicationVersionValidationService } from 'src/engine/core-modules/application/application-package/application-version-validation.service';
import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { KeyValuePairType } from 'src/engine/core-modules/key-value-pair/key-value-pair.entity';
import { KeyValuePairService } from 'src/engine/core-modules/key-value-pair/key-value-pair.service';
import {
  CRM_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  getHiddenStandardNavigationMenuItemUniversalIdentifiers,
  type WorkspaceTemplateDefinition,
} from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import {
  OnboardingException,
  OnboardingExceptionCode,
} from 'src/engine/core-modules/onboarding/onboarding.exception';
import {
  type ApplyTemplateErrorCode,
  type ApplyTemplateResult,
  type ApplyTemplateStep,
  type OperationStepErrorCode,
  type OperationStepStatus,
  type TemplateKeyVersion,
  type TemplatePreview,
  type TemplatePreviewApp,
  type TemplatePreviewNavigationChange,
} from 'src/engine/core-modules/onboarding/types/apply-template-operation.types';
import { getWorkspaceTemplateDefinition } from 'src/engine/core-modules/onboarding/utils/get-workspace-template-definition.util';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import {
  STANDARD_NAVIGATION_MENU_ITEM_DEFAULT_COLORS,
  STANDARD_NAVIGATION_MENU_ITEMS,
} from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-navigation-menu-item.constant';
import { createStandardNavigationMenuItemFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/navigation-menu-item/create-standard-navigation-menu-item-flat-metadata.util';
import { createStandardNavigationMenuItemLinkFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/navigation-menu-item/create-standard-navigation-menu-item-link-flat-metadata.util';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { NavigationMenuItemType } from 'twenty-shared/types';

type WorkspaceTemplateOperationKeyValueTypeMap = {
  [key: string]: ApplyTemplateResult | string[];
};

// Workspace-scoped provenance of the standard navigation rows hidden BY THE
// TEMPLATE FLOW (as opposed to rows the user deleted manually). Restore
// decisions read this record so a template switch restores only what a
// template hid, never user-removed navigation (C2).
const TEMPLATE_HIDDEN_NAVIGATION_KEY_VALUE_PAIR_KEY =
  'template-hidden-navigation';

// ApplicationInstallModule must NOT be imported into OnboardingModule: it would
// close an import cycle with the GraphQL query-runner modules and crash boot
// with "WorkspaceQueryHookModule before initialization". Resolve the service
// lazily through ModuleRef instead.
@Injectable()
export class WorkspaceTemplateService {
  private readonly logger = new Logger(WorkspaceTemplateService.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly applicationRegistrationService: ApplicationRegistrationService,
    private readonly moduleRef: ModuleRef,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
    private readonly applicationVersionValidationService: ApplicationVersionValidationService,
    private readonly cacheLockService: CacheLockService,
    private readonly keyValuePairService: KeyValuePairService<WorkspaceTemplateOperationKeyValueTypeMap>,
  ) {}

  private get applicationInstallService(): ApplicationInstallService {
    return this.moduleRef.get(ApplicationInstallService, { strict: false });
  }

  async applyWorkspaceTemplate({
    workspaceId,
    template,
  }: {
    workspaceId: string;
    template: WorkspaceTemplate;
  }): Promise<void> {
    // Legacy entrypoint: full seed semantics on a fresh workspace, no client
    // choices. Idempotency is server-side (workspace+template scoped key).
    await this.applyWorkspaceTemplateOperation({
      workspaceId,
      idempotencyKey: `legacy:${workspaceId}:${template}`,
      template,
    });
  }

  // Setup operation per P1.6a contract §4–§5: one authorized, resumable
  // operation with per-step capture, same-key idempotency and typed failures.
  async applyWorkspaceTemplateOperation({
    workspaceId,
    idempotencyKey,
    template,
    templateVersion,
    deselectedOptionalAppUniversalIdentifiers = [],
    sampleContentEnabled = false,
  }: {
    workspaceId: string;
    idempotencyKey: string;
    template: WorkspaceTemplate;
    templateVersion?: number;
    deselectedOptionalAppUniversalIdentifiers?: string[];
    sampleContentEnabled?: boolean;
  }): Promise<ApplyTemplateResult> {
    const definition = getWorkspaceTemplateDefinition(template);

    if (isDefined(templateVersion) && templateVersion !== definition.version) {
      throw new OnboardingException(
        `Template ${template} version conflict: requested ${templateVersion}, current ${definition.version}`,
        OnboardingExceptionCode.TEMPLATE_VERSION_CONFLICT,
      );
    }

    const requiredApplicationUniversalIdentifiers =
      definition.applicationUniversalIdentifiers.filter(
        (applicationUniversalIdentifier) =>
          !definition.optionalApplicationUniversalIdentifiers.includes(
            applicationUniversalIdentifier,
          ),
      );

    // Every non-deselected app is attempted, optional ones included: an
    // unchecked optional app is deselected explicitly, while a checked or
    // absent-optional app is part of the chosen bundle. Optional installs that
    // fail are excluded from the bundle instead of blocking it (C2).
    const selectedApplicationUniversalIdentifiers =
      definition.applicationUniversalIdentifiers.filter(
        (applicationUniversalIdentifier) =>
          !deselectedOptionalAppUniversalIdentifiers.includes(
            applicationUniversalIdentifier,
          ),
      );

    const deselectedUnknownAppUniversalIdentifiers =
      deselectedOptionalAppUniversalIdentifiers.filter(
        (applicationUniversalIdentifier) =>
          !definition.optionalApplicationUniversalIdentifiers.includes(
            applicationUniversalIdentifier,
          ),
      );

    if (deselectedUnknownAppUniversalIdentifiers.length > 0) {
      const deselectedRequiredAppUniversalIdentifiers =
        deselectedUnknownAppUniversalIdentifiers.filter(
          (applicationUniversalIdentifier) =>
            definition.applicationUniversalIdentifiers.includes(
              applicationUniversalIdentifier,
            ),
        );

      throw new OnboardingException(
        `Apps ${deselectedUnknownAppUniversalIdentifiers.join(', ')} cannot be deselected in template ${template}`,
        deselectedRequiredAppUniversalIdentifiers.length > 0
          ? OnboardingExceptionCode.TEMPLATE_REQUIRED_APP_DESELECTED
          : OnboardingExceptionCode.TEMPLATE_APP_NOT_IN_DEFINITION,
      );
    }

    const persistedSteps = await this.runOperationUnderIdempotencyLock({
      workspaceId,
      idempotencyKey,
      definition,
      template,
      requestedTemplateKeyVersion: {
        key: template,
        version: definition.version,
      },
      requiredApplicationUniversalIdentifiers,
      selectedApplicationUniversalIdentifiers,
      sampleContentEnabled,
    });

    const appliedTemplateKeyVersion = persistedSteps.some(
      (step) =>
        step.kind === 'set-workspace-template' && step.status === 'succeeded',
    )
      ? { key: template, version: definition.version }
      : null;

    return {
      operationId: idempotencyKey,
      requestedTemplateKeyVersion: {
        key: template,
        version: definition.version,
      },
      appliedTemplateKeyVersion,
      steps: persistedSteps,
    };
  }

  private async runOperationUnderIdempotencyLock({
    workspaceId,
    idempotencyKey,
    definition,
    template,
    requestedTemplateKeyVersion,
    requiredApplicationUniversalIdentifiers,
    selectedApplicationUniversalIdentifiers,
    sampleContentEnabled,
  }: {
    workspaceId: string;
    idempotencyKey: string;
    definition: WorkspaceTemplateDefinition;
    template: WorkspaceTemplate;
    requestedTemplateKeyVersion: TemplateKeyVersion;
    requiredApplicationUniversalIdentifiers: string[];
    selectedApplicationUniversalIdentifiers: string[];
    sampleContentEnabled: boolean;
  }): Promise<ApplyTemplateStep[]> {
    const lockKey = `template-operation:${workspaceId}`;

    return this.cacheLockService.withLock(
      async () => {
        const existingOperation = await this.getStoredOperation({
          workspaceId,
          idempotencyKey,
        });

        if (isDefined(existingOperation)) {
          const existingRequestedTemplateKeyVersion =
            existingOperation.requestedTemplateKeyVersion;

          if (
            existingRequestedTemplateKeyVersion?.key !==
              requestedTemplateKeyVersion.key ||
            existingRequestedTemplateKeyVersion?.version !==
              requestedTemplateKeyVersion.version
          ) {
            throw new OnboardingException(
              `Idempotency key ${idempotencyKey} already used for a different template configuration`,
              OnboardingExceptionCode.TEMPLATE_IDEMPOTENCY_CONFLICT,
            );
          }

          // Same key retried: resume, re-running only non-succeeded steps.
          const remainingSteps = await this.runRemainingSteps({
            workspaceId,
            definition,
            template,
            requiredApplicationUniversalIdentifiers,
            previousSteps: existingOperation.steps,
          });

          const resumedSteps = existingOperation.steps.map((previousStep) => {
            const rerunStep = remainingSteps.find(
              (remainingStep) =>
                remainingStep.kind === previousStep.kind &&
                remainingStep.targetUniversalIdentifier ===
                  previousStep.targetUniversalIdentifier,
            );

            return rerunStep ?? previousStep;
          });

          await this.storeOperation({
            workspaceId,
            idempotencyKey,
            operation: {
              operationId: idempotencyKey,
              requestedTemplateKeyVersion,
              appliedTemplateKeyVersion: resumedSteps.some(
                (step) =>
                  step.kind === 'set-workspace-template' &&
                  step.status === 'succeeded',
              )
                ? requestedTemplateKeyVersion
                : null,
              steps: resumedSteps,
            },
          });

          return resumedSteps;
        }

        const initialSteps = this.buildInitialSteps({
          selectedApplicationUniversalIdentifiers,
          definition,
          sampleContentEnabled,
        });

        const steps = await this.runRemainingSteps({
          workspaceId,
          definition,
          template,
          requiredApplicationUniversalIdentifiers,
          previousSteps: initialSteps,
        });

        await this.storeOperation({
          workspaceId,
          idempotencyKey,
          operation: {
            operationId: idempotencyKey,
            requestedTemplateKeyVersion,
            appliedTemplateKeyVersion: steps.some(
              (step) =>
                step.kind === 'set-workspace-template' &&
                step.status === 'succeeded',
            )
              ? requestedTemplateKeyVersion
              : null,
            steps,
          },
        });

        return steps;
      },
      lockKey,
      { ttl: 600_000, ms: 500, maxRetries: 1200 },
    );
  }

  private buildInitialSteps({
    selectedApplicationUniversalIdentifiers,
    definition,
    sampleContentEnabled,
  }: {
    selectedApplicationUniversalIdentifiers: string[];
    definition: WorkspaceTemplateDefinition;
    sampleContentEnabled: boolean;
  }): ApplyTemplateStep[] {
    const steps: ApplyTemplateStep[] =
      selectedApplicationUniversalIdentifiers.map(
        (applicationUniversalIdentifier) => ({
          kind: 'install-app',
          targetUniversalIdentifier: applicationUniversalIdentifier,
          status: 'pending',
        }),
      );

    steps.push({
      kind: 'navigation-visibility',
      status: 'pending',
    });

    if (sampleContentEnabled || definition.sampleContentEnabled) {
      steps.push({
        kind: 'seed-samples',
        status: 'pending',
      });
    }

    steps.push({
      kind: 'set-workspace-template',
      status: 'pending',
    });

    return steps;
  }

  // Re-runs only pending/failed steps; succeeded steps are left untouched so
  // a retry never duplicates app installs or seeds (contract §5).
  private async runRemainingSteps({
    workspaceId,
    definition,
    template,
    requiredApplicationUniversalIdentifiers,
    previousSteps,
  }: {
    workspaceId: string;
    definition: WorkspaceTemplateDefinition;
    template: WorkspaceTemplate;
    requiredApplicationUniversalIdentifiers: string[];
    previousSteps: ApplyTemplateStep[];
  }): Promise<ApplyTemplateStep[]> {
    const steps = previousSteps.map((previousStep) => ({ ...previousStep }));

    for (const step of steps) {
      if (step.status === 'succeeded' || step.status === 'running') {
        continue;
      }

      if (step.kind === 'install-app') {
        const installStep = await this.installTemplateApplication({
          workspaceId,
          applicationUniversalIdentifier: isDefined(
            step.targetUniversalIdentifier,
          )
            ? step.targetUniversalIdentifier
            : '',
        });

        step.status = installStep.status;
        step.errorCode = installStep.errorCode;
        step.localizedMessage = installStep.localizedMessage;

        continue;
      }

      if (step.kind === 'navigation-visibility') {
        // The step is driven by the template-hidden provenance record, not the
        // hide-list alone: a CRM-off template that previously deleted managed
        // rows must be restored by a later CRM apply even when CRM hides
        // nothing, while a row the USER deleted manually (no provenance) is
        // never resurrected (C2: restore only what the template hid). The
        // method no-ops (returns early) when there is nothing to delete and
        // nothing to restore, so a complete workspace stays untouched.
        try {
          await this.applyTemplateNavigationVisibility({
            workspaceId,
            hiddenUniversalIdentifiers:
              getHiddenStandardNavigationMenuItemUniversalIdentifiers(
                definition,
              ),
          });

          step.status = 'succeeded';
        } catch (error) {
          this.logger.error(
            `Failed to apply template navigation visibility for workspace ${workspaceId}`,
            error,
          );

          step.status = 'failed';
          step.errorCode = 'NAVIGATION_FAILED';
          step.localizedMessage =
            'Navigation update failed. You can retry this setup later.';
        }

        continue;
      }

      if (step.kind === 'seed-samples') {
        const seedStep = await this.resolveSampleSeedingStep({
          workspaceId,
          definition,
          steps,
        });

        step.status = seedStep.status;
        step.errorCode = seedStep.errorCode;
        step.localizedMessage = seedStep.localizedMessage;

        continue;
      }

      if (step.kind === 'set-workspace-template') {
        // The template row is only set when every install step succeeded so
        // the workspace never claims a template whose apps are half-missing.
        const failedInstallSteps = steps.filter(
          (candidateStep) =>
            candidateStep.kind === 'install-app' &&
            candidateStep.status !== 'succeeded',
        );

        const optionalInstallSteps = steps.filter(
          (candidateStep) =>
            candidateStep.kind === 'install-app' &&
            !requiredApplicationUniversalIdentifiers.includes(
              isDefined(candidateStep.targetUniversalIdentifier)
                ? candidateStep.targetUniversalIdentifier
                : '',
            ),
        );

        const blockingFailedSteps = failedInstallSteps.filter(
          (failedStep) =>
            !optionalInstallSteps.some(
              (optionalStep) =>
                optionalStep.targetUniversalIdentifier ===
                failedStep.targetUniversalIdentifier,
            ),
        );

        if (
          blockingFailedSteps.length > 0 ||
          steps.some(
            (candidateStep) =>
              candidateStep.kind !== 'install-app' &&
              candidateStep.kind !== 'set-workspace-template' &&
              candidateStep.status === 'failed',
          )
        ) {
          step.status = 'skipped';

          continue;
        }

        await this.workspaceRepository.update(
          { id: workspaceId },
          { workspaceTemplate: template },
        );

        step.status = 'succeeded';
      }
    }

    return steps;
  }

  // App hooks own the seed writes; confirm their persisted result instead of
  // treating an enqueued job (or a synchronous hook on a prior install) as proof.
  private async resolveSampleSeedingStep({
    workspaceId,
    definition,
    steps,
  }: {
    workspaceId: string;
    definition: WorkspaceTemplateDefinition;
    steps: ApplyTemplateStep[];
  }): Promise<{
    status: OperationStepStatus;
    errorCode?: OperationStepErrorCode;
    localizedMessage?: string;
  }> {
    const sampleApplicationUniversalIdentifiers = new Set(
      definition.starterBundleContents.map(
        (sample) => sample.applicationUniversalIdentifier,
      ),
    );
    const sampleInstalls = steps.filter(
      (step) =>
        step.kind === 'install-app' &&
        isDefined(step.targetUniversalIdentifier) &&
        sampleApplicationUniversalIdentifiers.has(
          step.targetUniversalIdentifier,
        ),
    );

    if (
      sampleInstalls.length === 0 ||
      sampleInstalls.some((step) => step.status !== 'succeeded')
    ) {
      return { status: 'skipped' };
    }

    try {
      const workspaceOrmManager = this.moduleRef.get(WorkspaceOrmManager, {
        strict: false,
      });
      const sampleTitles = definition.starterBundleContents.map(
        (sample) => sample.recordTitle ?? sample.label,
      );
      const documents = await workspaceOrmManager.executeInWorkspaceContext(
        () =>
          workspaceOrmManager
            .getRepository<{
              id: string;
              title: string;
              kind: string;
            }>('document', { shouldBypassPermissionChecks: true })
            .find({
              where: { title: In(sampleTitles), kind: 'TEMPLATE' },
              select: { id: true, title: true },
            }),
        buildSystemAuthContext(workspaceId),
      );
      const persistedTitles = new Set(
        documents.map((document) => document.title),
      );

      if (sampleTitles.every((title) => persistedTitles.has(title))) {
        return { status: 'succeeded' };
      }
    } catch (error) {
      this.logger.warn(
        `Could not confirm starter content for workspace ${workspaceId}`,
        error,
      );
    }

    return {
      status: 'failed',
      errorCode: 'SEED_FAILED',
      localizedMessage:
        'Starter content is not ready yet. Retry to check again; your installed apps are kept.',
    };
  }

  async configureOnboardingNavigation({
    workspaceId,
    crmEnabled,
  }: {
    workspaceId: string;
    crmEnabled: boolean;
  }): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      select: { id: true, workspaceTemplate: true },
    });

    // A completed template is authoritative when onboarding continues or is replayed.
    if (isDefined(workspace?.workspaceTemplate)) {
      return;
    }

    await this.applyTemplateNavigationVisibility({
      workspaceId,
      hiddenUniversalIdentifiers: crmEnabled
        ? []
        : CRM_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
    });
  }

  private async getStoredOperation({
    workspaceId,
    idempotencyKey,
  }: {
    workspaceId: string;
    idempotencyKey: string;
  }): Promise<ApplyTemplateResult | null> {
    // get() returns full KeyValuePair rows (payload nested under `value`),
    // though its generic signature types rows as bare payloads.
    const [storedKeyValuePair] = (await this.keyValuePairService.get({
      type: KeyValuePairType.USER_VARIABLE,
      userId: null,
      workspaceId,
      key: `template-operation:${idempotencyKey}`,
    })) as unknown as Array<{ value: ApplyTemplateResult } | undefined>;

    const storedValue = storedKeyValuePair?.value;

    return isDefined(storedValue) ? storedValue : null;
  }

  private async storeOperation({
    workspaceId,
    idempotencyKey,
    operation,
  }: {
    workspaceId: string;
    idempotencyKey: string;
    operation: ApplyTemplateResult;
  }): Promise<void> {
    // KeyValuePairService.set() takes the payload; get() returns rows where it
    // is nested under `value`.
    await this.keyValuePairService.set({
      type: KeyValuePairType.USER_VARIABLE,
      userId: null,
      workspaceId,
      key: `template-operation:${idempotencyKey}`,
      value: operation,
    });
  }

  async getWorkspaceTemplatePreview({
    workspaceId,
    template,
  }: {
    workspaceId: string;
    template: WorkspaceTemplate;
  }): Promise<TemplatePreview> {
    const definition = getWorkspaceTemplateDefinition(template);

    const previewApps: TemplatePreviewApp[] = [];

    let blocked = false;

    for (const applicationUniversalIdentifier of definition.applicationUniversalIdentifiers) {
      const registration =
        await this.applicationRegistrationService.findOneByUniversalIdentifierGlobal(
          applicationUniversalIdentifier,
        );

      const required =
        !definition.optionalApplicationUniversalIdentifiers.includes(
          applicationUniversalIdentifier,
        );

      let versionCompatible = false;

      if (isDefined(registration)) {
        const versionValidation =
          await this.applicationVersionValidationService.validateWorkspaceCompatibility(
            {
              requiredServerVersion:
                registration.manifest?.application
                  ?.requiredServerVersionRange ?? undefined,
              workspaceId,
            },
          );

        versionCompatible = versionValidation.compatible;
      }

      const installedApplication =
        await this.applicationService.findByUniversalIdentifier({
          universalIdentifier: applicationUniversalIdentifier,
          workspaceId,
        });
      const currentlyInstalled =
        installedApplication?.state === ApplicationState.INSTALLED;

      if (!isDefined(registration) || !versionCompatible) {
        blocked = required ? true : blocked;
      }

      previewApps.push({
        universalIdentifier: applicationUniversalIdentifier,
        displayName: registration?.name ?? applicationUniversalIdentifier,
        registered: isDefined(registration),
        versionCompatible,
        required,
        currentlyInstalled,
      });
    }

    // The preview must advertise the same diff the apply will run: hides are
    // limited to rows still present, restores to rows a template previously
    // hid (provenance) that this template does not keep hidden. Advertising
    // intent instead of the resolved diff would contradict the apply.
    const navigationChanges = await this.buildTemplateNavigationPreviewChanges({
      workspaceId,
      definition,
    });

    // Only preview content for apps that are actually ready on this server:
    // an unregistered or incompatible app cannot seed its bundle, so its
    // proposed contents must not be shown as part of the persona.
    const readyApplicationUniversalIdentifiers = new Set(
      previewApps
        .filter(
          (previewApp) => previewApp.registered && previewApp.versionCompatible,
        )
        .map((previewApp) => previewApp.universalIdentifier),
    );

    // A template that expects apps but has none registered on this server is
    // "no apps available", not a broken preview: the client must be able to
    // tell that apart from a permission denial or a network failure (C2).
    // CRM-only expects no apps, so it never carries this discriminator.
    const errorCode: ApplyTemplateErrorCode | null =
      isNonEmptyArray(definition.applicationUniversalIdentifiers) &&
      !isNonEmptyArray(
        previewApps.filter((previewApp) => previewApp.registered),
      )
        ? 'NO_APPS_AVAILABLE'
        : null;

    return {
      templateKey: template,
      version: definition.version,
      apps: previewApps,
      navigationChanges,
      samples: definition.starterBundleContents
        .filter((bundleContent) =>
          readyApplicationUniversalIdentifiers.has(
            bundleContent.applicationUniversalIdentifier,
          ),
        )
        .map((bundleContent) => ({
          label: bundleContent.label,
          locale: bundleContent.locale,
        })),
      // Blocked contents are gated upstream, not by this server's readiness, so
      // they are always surfaced — a persona's deferred content never vanishes.
      blockedSamples: definition.blockedStarterBundleContents.map(
        (blockedContent) => ({
          label: blockedContent.label,
          locale: blockedContent.locale,
          blockedBy: blockedContent.blockedBy,
        }),
      ),
      blocked,
      errorCode,
    };
  }

  private async installTemplateApplication({
    workspaceId,
    applicationUniversalIdentifier,
  }: {
    workspaceId: string;
    applicationUniversalIdentifier: string;
  }): Promise<ApplyTemplateStep> {
    const step: ApplyTemplateStep = {
      kind: 'install-app',
      targetUniversalIdentifier: applicationUniversalIdentifier,
      status: 'pending',
    };

    try {
      const registration =
        await this.applicationRegistrationService.findOneByUniversalIdentifierGlobal(
          applicationUniversalIdentifier,
        );

      if (!isDefined(registration)) {
        this.logger.warn(
          `Template app ${applicationUniversalIdentifier} is not registered on this server, marking install as failed for workspace ${workspaceId}`,
        );

        return {
          ...step,
          status: 'failed',
          errorCode: 'APP_NOT_REGISTERED',
          localizedMessage:
            'This app is not available on this server yet. You can retry the setup later.',
        };
      }

      const versionValidation =
        await this.applicationVersionValidationService.validateWorkspaceCompatibility(
          {
            requiredServerVersion:
              registration.manifest?.application?.requiredServerVersionRange ??
              undefined,
            workspaceId,
          },
        );

      if (!versionValidation.compatible) {
        return {
          ...step,
          status: 'failed',
          errorCode: 'VERSION_INCOMPATIBLE',
          localizedMessage:
            'This app version is not compatible with your workspace. Please contact your administrator.',
        };
      }

      // Skip the install when the app is already installed at a compatible
      // version — calling installApplication unconditionally causes
      // validateVersionProgression to throw APP_ALREADY_INSTALLED/SAME_VERSION,
      // which reports FAILED and prevents honest retry completion (M2 exit
      // criteria c/d). The preview's `currentlyInstalled` flag already exposes
      // this state to the caller; the apply step mirrors it (C2).
      const existingApplication =
        await this.applicationService.findByUniversalIdentifier({
          universalIdentifier: applicationUniversalIdentifier,
          workspaceId,
        });

      if (existingApplication?.state === ApplicationState.INSTALLED) {
        this.logger.log(
          `Template app ${applicationUniversalIdentifier} is already installed on workspace ${workspaceId}, skipping install`,
        );

        return {
          ...step,
          status: 'succeeded',
        };
      }

      try {
        await this.applicationInstallService.installApplication({
          appRegistrationId: registration.id,
          workspaceId,
        });
      } catch (error) {
        // Provisioning can finish while we wait for the installer's app lock.
        if (
          !(error instanceof ApplicationException) ||
          error.code !== ApplicationExceptionCode.APP_ALREADY_INSTALLED
        ) {
          throw error;
        }

        const installedApplication =
          await this.applicationService.findByUniversalIdentifier({
            universalIdentifier: applicationUniversalIdentifier,
            workspaceId,
          });

        if (installedApplication?.state !== ApplicationState.INSTALLED) {
          throw error;
        }
      }

      return {
        ...step,
        status: 'succeeded',
      };
    } catch (error) {
      this.logger.error(
        `Failed to install template app ${applicationUniversalIdentifier} for workspace ${workspaceId}: ${describeApplicationInstallError(error)}`,
        error,
      );

      return {
        ...step,
        status: 'failed',
        errorCode: 'INSTALL_FAILED',
        localizedMessage:
          'The app installation failed. You can retry the setup later.',
      };
    }
  }

  private async applyTemplateNavigationVisibility({
    workspaceId,
    hiddenUniversalIdentifiers,
  }: {
    workspaceId: string;
    hiddenUniversalIdentifiers: string[];
  }): Promise<void> {
    const { flatNavigationMenuItemMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatNavigationMenuItemMaps',
      ]);

    const existingItemsByUniversalIdentifier = new Map(
      Object.values(flatNavigationMenuItemMaps.byUniversalIdentifier)
        .filter(isDefined)
        .map((navigationMenuItem) => [
          navigationMenuItem.universalIdentifier,
          navigationMenuItem,
        ]),
    );

    const hiddenUniversalIdentifierSet = new Set(hiddenUniversalIdentifiers);

    const navigationMenuItemsToDelete = [
      ...existingItemsByUniversalIdentifier.values(),
    ].filter((navigationMenuItem) =>
      hiddenUniversalIdentifierSet.has(navigationMenuItem.universalIdentifier),
    );

    // Only rows the template flow hid are restore candidates: an absent row
    // without provenance was removed by the user and must stay deleted.
    const templateHiddenUniversalIdentifiers =
      await this.resolveTemplateHiddenNavigationUniversalIdentifiers({
        workspaceId,
      });

    const universalIdentifiersToRestore =
      templateHiddenUniversalIdentifiers.filter(
        (universalIdentifier) =>
          TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.includes(
            universalIdentifier,
          ) &&
          !hiddenUniversalIdentifierSet.has(universalIdentifier) &&
          !existingItemsByUniversalIdentifier.has(universalIdentifier),
      );

    if (
      navigationMenuItemsToDelete.length === 0 &&
      universalIdentifiersToRestore.length === 0
    ) {
      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const navigationMenuItemsToCreate =
      await this.buildStandardNavigationMenuItemsToRestore({
        workspaceId,
        universalIdentifiersToRestore,
        twentyStandardApplicationId: twentyStandardFlatApplication.id,
      });

    if (
      navigationMenuItemsToDelete.length === 0 &&
      navigationMenuItemsToCreate.length === 0
    ) {
      return;
    }

    const result =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          isSystemBuild: true,
          workspaceId,
          applicationUniversalIdentifier:
            twentyStandardFlatApplication.universalIdentifier,
          allFlatEntityOperationByMetadataName: {
            navigationMenuItem: {
              flatEntityToCreate: navigationMenuItemsToCreate,
              flatEntityToDelete: navigationMenuItemsToDelete,
              flatEntityToUpdate: [],
            },
          },
        },
      );

    if (result.status === 'fail') {
      throw new Error(
        `Template navigation migration failed for workspace ${workspaceId}: ${JSON.stringify(result, null, 2)}`,
      );
    }

    // Persist the provenance only after the migration succeeded: rows this
    // apply hid enter the record, rows it restored leave it. Writing earlier
    // would make a retry after a failed restore migration skip the rows it
    // already removed from the record, losing them permanently. Only rows the
    // builder actually created leave the record — a warn-skipped row stays so
    // the next apply retries it.
    const restoredUniversalIdentifierSet = new Set(
      navigationMenuItemsToCreate.map(
        (navigationMenuItem) => navigationMenuItem.universalIdentifier,
      ),
    );

    const nextTemplateHiddenUniversalIdentifiers = [
      ...new Set([
        ...templateHiddenUniversalIdentifiers.filter(
          (universalIdentifier) =>
            !restoredUniversalIdentifierSet.has(universalIdentifier),
        ),
        ...navigationMenuItemsToDelete.map(
          (navigationMenuItem) => navigationMenuItem.universalIdentifier,
        ),
      ]),
    ];

    await this.keyValuePairService.set({
      type: KeyValuePairType.USER_VARIABLE,
      userId: null,
      workspaceId,
      key: TEMPLATE_HIDDEN_NAVIGATION_KEY_VALUE_PAIR_KEY,
      value: nextTemplateHiddenUniversalIdentifiers,
    });
  }

  // The rows a template previously hid on this workspace. Prefer the persisted
  // provenance record; workspaces configured before the record existed are
  // inferred once from the persisted template row (its hide-list is the only
  // legacy writer of managed-row deletions).
  private async resolveTemplateHiddenNavigationUniversalIdentifiers({
    workspaceId,
  }: {
    workspaceId: string;
  }): Promise<string[]> {
    const [storedKeyValuePair] = (await this.keyValuePairService.get({
      type: KeyValuePairType.USER_VARIABLE,
      userId: null,
      workspaceId,
      key: TEMPLATE_HIDDEN_NAVIGATION_KEY_VALUE_PAIR_KEY,
    })) as unknown as Array<{ value: string[] } | undefined>;

    const managedUniversalIdentifierSet = new Set<string>(
      TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
    );

    if (Array.isArray(storedKeyValuePair?.value)) {
      return storedKeyValuePair.value.filter((universalIdentifier) =>
        managedUniversalIdentifierSet.has(universalIdentifier),
      );
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      select: { id: true, workspaceTemplate: true },
    });

    if (!isDefined(workspace?.workspaceTemplate)) {
      return [];
    }

    // Before provenance was stored, only Individual and Student hid the three
    // sales entries. Newer definitions must not resurrect user-removed rows.
    return workspace.workspaceTemplate === WorkspaceTemplate.INDIVIDUAL ||
      workspace.workspaceTemplate === WorkspaceTemplate.STUDENT
      ? CRM_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.slice(0, 3).filter(
          (universalIdentifier) =>
            managedUniversalIdentifierSet.has(universalIdentifier),
        )
      : [];
  }

  private async buildTemplateNavigationPreviewChanges({
    workspaceId,
    definition,
  }: {
    workspaceId: string;
    definition: WorkspaceTemplateDefinition;
  }): Promise<TemplatePreviewNavigationChange[]> {
    const { flatNavigationMenuItemMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatNavigationMenuItemMaps',
      ]);

    const presentUniversalIdentifiers = new Set(
      Object.values(flatNavigationMenuItemMaps.byUniversalIdentifier)
        .filter(isDefined)
        .map((navigationMenuItem) => navigationMenuItem.universalIdentifier),
    );

    const templateHiddenUniversalIdentifiers =
      await this.resolveTemplateHiddenNavigationUniversalIdentifiers({
        workspaceId,
      });

    const hiddenUniversalIdentifiers =
      getHiddenStandardNavigationMenuItemUniversalIdentifiers(definition);

    return [
      ...hiddenUniversalIdentifiers
        .filter((universalIdentifier) =>
          presentUniversalIdentifiers.has(universalIdentifier),
        )
        .map((universalIdentifier) => ({
          universalIdentifier,
          action: 'hide' as const,
        })),
      ...templateHiddenUniversalIdentifiers
        .filter(
          (universalIdentifier) =>
            !hiddenUniversalIdentifiers.includes(universalIdentifier) &&
            !presentUniversalIdentifiers.has(universalIdentifier),
        )
        .map((universalIdentifier) => ({
          universalIdentifier,
          action: 'restore' as const,
        })),
    ];
  }

  private async buildStandardNavigationMenuItemsToRestore({
    workspaceId,
    universalIdentifiersToRestore,
    twentyStandardApplicationId,
  }: {
    workspaceId: string;
    universalIdentifiersToRestore: string[];
    twentyStandardApplicationId: string;
  }) {
    if (universalIdentifiersToRestore.length === 0) {
      return [];
    }

    const { flatViewMaps } = await this.workspaceCacheService.getOrRecompute(
      workspaceId,
      ['flatViewMaps'],
    );

    const now = new Date().toISOString();
    const navigationMenuItemNames = Object.keys(
      STANDARD_NAVIGATION_MENU_ITEMS,
    ) as (keyof typeof STANDARD_NAVIGATION_MENU_ITEMS)[];

    const navigationMenuItemsToCreate = [];

    for (const universalIdentifier of universalIdentifiersToRestore) {
      const navigationMenuItemName = navigationMenuItemNames.find(
        (name) =>
          STANDARD_NAVIGATION_MENU_ITEMS[name].universalIdentifier ===
          universalIdentifier,
      );

      if (!isDefined(navigationMenuItemName)) {
        this.logger.warn(
          `No standard definition for navigation menu item ${universalIdentifier}, skipping restore`,
        );

        continue;
      }
      const definition = STANDARD_NAVIGATION_MENU_ITEMS[navigationMenuItemName];

      try {
        if (definition.type === NavigationMenuItemType.LINK) {
          navigationMenuItemsToCreate.push(
            createStandardNavigationMenuItemLinkFlatMetadata({
              universalIdentifier,
              name: definition.name,
              link: definition.link,
              icon: definition.icon,
              color:
                STANDARD_NAVIGATION_MENU_ITEM_DEFAULT_COLORS[
                  navigationMenuItemName
                ] ?? null,
              position: definition.position,
              navigationMenuItemId: randomUUID(),
              workspaceId,
              twentyStandardApplicationId,
              now,
            }),
          );

          continue;
        }

        if (definition.type !== NavigationMenuItemType.OBJECT) {
          this.logger.warn(
            `Standard navigation menu item ${universalIdentifier} is not an OBJECT or LINK row, skipping restore`,
          );

          continue;
        }

        const objectDefinition =
          definition as (typeof STANDARD_NAVIGATION_MENU_ITEMS)[typeof navigationMenuItemName] & {
            viewUniversalIdentifier: string;
          };

        navigationMenuItemsToCreate.push(
          createStandardNavigationMenuItemFlatMetadata({
            workspaceId,
            navigationMenuItemName,
            viewUniversalIdentifier: objectDefinition.viewUniversalIdentifier,
            position: definition.position,
            navigationMenuItemId: randomUUID(),
            dependencyFlatEntityMaps: { flatViewMaps },
            twentyStandardApplicationId,
            now,
          }),
        );
      } catch (error) {
        this.logger.warn(
          `Failed to build standard navigation menu item ${universalIdentifier} for workspace ${workspaceId}, skipping restore`,
          error,
        );
      }
    }

    return navigationMenuItemsToCreate;
  }
}
