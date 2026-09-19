import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';

import { randomUUID } from 'crypto';

import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { type Repository } from 'typeorm';

import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { ApplicationVersionValidationService } from 'src/engine/core-modules/application/application-package/application-version-validation.service';
import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { KeyValuePairType } from 'src/engine/core-modules/key-value-pair/key-value-pair.entity';
import { KeyValuePairService } from 'src/engine/core-modules/key-value-pair/key-value-pair.service';
import {
  TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  type WorkspaceTemplateDefinition,
} from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import {
  OnboardingException,
  OnboardingExceptionCode,
} from 'src/engine/core-modules/onboarding/onboarding.exception';
import {
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
import { STANDARD_NAVIGATION_MENU_ITEMS } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-navigation-menu-item.constant';
import { createStandardNavigationMenuItemFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/navigation-menu-item/create-standard-navigation-menu-item-flat-metadata.util';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { NavigationMenuItemType } from 'twenty-shared/types';

type WorkspaceTemplateOperationKeyValueTypeMap = {
  [key: string]: ApplyTemplateResult;
};

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
    const lockKey = `template-operation:${workspaceId}:${idempotencyKey}`;

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
      { ttl: 60_000, ms: 500, maxRetries: 120 },
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
        if (
          !isNonEmptyArray(
            definition.hiddenStandardNavigationMenuItemUniversalIdentifiers,
          )
        ) {
          step.status = 'skipped';

          continue;
        }

        try {
          await this.applyTemplateNavigationVisibility({
            workspaceId,
            hiddenUniversalIdentifiers:
              definition.hiddenStandardNavigationMenuItemUniversalIdentifiers,
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

        if (blockingFailedSteps.length > 0) {
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

  // Sample seeding is app-owned since P1.6d: post-install hooks seed starter
  // content during the install steps, so this step only reports that outcome.
  // No parallel server-side seeder — that would duplicate a primitive that
  // already exists and would bypass the app's own provenance checks.
  private async resolveSampleSeedingStep({
    workspaceId,
    steps,
  }: {
    workspaceId: string;
    steps: ApplyTemplateStep[];
  }): Promise<{
    status: OperationStepStatus;
    errorCode?: OperationStepErrorCode;
    localizedMessage?: string;
  }> {
    // Only succeeded installs ran their post-install hook: a failed install
    // seeded nothing, and reporting seeding as done would fake success.
    const installedAppUniversalIdentifiers = steps
      .filter(
        (candidateStep) =>
          candidateStep.kind === 'install-app' &&
          candidateStep.status === 'succeeded',
      )
      .map((installedAppStep) => installedAppStep.targetUniversalIdentifier)
      .filter(isDefined);

    if (installedAppUniversalIdentifiers.length === 0) {
      return { status: 'skipped' };
    }

    const postInstallHooks = await Promise.all(
      installedAppUniversalIdentifiers.map(
        async (applicationUniversalIdentifier) => {
          const registration =
            await this.applicationRegistrationService.findOneByUniversalIdentifierGlobal(
              applicationUniversalIdentifier,
            );

          return registration?.manifest?.application?.postInstallLogicFunction;
        },
      ),
    );

    const definedPostInstallHooks = postInstallHooks.filter(isDefined);

    if (definedPostInstallHooks.length === 0) {
      return {
        status: 'skipped',
        localizedMessage:
          'No sample content is defined for the installed apps.',
      };
    }

    // A synchronous hook is past proof: ApplicationInstallService awaits it
    // during the install step and aborts the install on error, so a succeeded
    // install means the hook ran to completion. An asynchronous hook is only
    // enqueued, so the operation resolves before seeding runs and cannot
    // confirm the samples landed — reporting `succeeded` here would fake a
    // completed preset (contract §5 2026-09-17).
    const hasAsynchronousPostInstallHook = definedPostInstallHooks.some(
      (postInstallLogicFunction) =>
        postInstallLogicFunction.shouldRunSynchronously !== true,
    );

    if (hasAsynchronousPostInstallHook) {
      this.logger.warn(
        `Sample seeding for workspace ${workspaceId} is delegated to an asynchronous post-install hook and cannot be confirmed; reporting the seed-samples step as failed`,
      );

      return {
        status: 'failed',
        errorCode: 'SEED_FAILED',
        localizedMessage:
          'Sample content is created in the background and could not be confirmed yet. Retry the setup later.',
      };
    }

    this.logger.log(
      `Sample seeding for workspace ${workspaceId} completed during the synchronous post-install hooks`,
    );

    return {
      status: 'succeeded',
      localizedMessage: 'Starter content was provided by the installed apps.',
    };
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

      const currentlyInstalled = isDefined(
        await this.applicationService.findByUniversalIdentifier({
          universalIdentifier: applicationUniversalIdentifier,
          workspaceId,
        }),
      );

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

    const navigationChanges: TemplatePreviewNavigationChange[] = [
      ...definition.hiddenStandardNavigationMenuItemUniversalIdentifiers.map(
        (universalIdentifier) => ({
          universalIdentifier,
          action: 'hide' as const,
        }),
      ),
      ...TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.filter(
        (universalIdentifier) =>
          !definition.hiddenStandardNavigationMenuItemUniversalIdentifiers.includes(
            universalIdentifier,
          ),
      ).map((universalIdentifier) => ({
        universalIdentifier,
        action: 'restore' as const,
      })),
    ];

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

      await this.applicationInstallService.installApplication({
        appRegistrationId: registration.id,
        workspaceId,
      });

      return {
        ...step,
        status: 'succeeded',
      };
    } catch (error) {
      this.logger.error(
        `Failed to install template app ${applicationUniversalIdentifier} for workspace ${workspaceId}`,
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

    const universalIdentifiersToRestore =
      TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.filter(
        (universalIdentifier) =>
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

      if (definition.type !== NavigationMenuItemType.OBJECT) {
        this.logger.warn(
          `Standard navigation menu item ${universalIdentifier} is not an OBJECT row, skipping restore`,
        );

        continue;
      }

      const objectDefinition =
        definition as (typeof STANDARD_NAVIGATION_MENU_ITEMS)[typeof navigationMenuItemName] & {
          viewUniversalIdentifier: string;
        };

      try {
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
