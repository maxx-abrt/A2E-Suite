import { ModuleRef } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';

import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { ApplicationVersionValidationService } from 'src/engine/core-modules/application/application-package/application-version-validation.service';
import { type ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { KeyValuePairService } from 'src/engine/core-modules/key-value-pair/key-value-pair.service';
import { TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import { OnboardingExceptionCode } from 'src/engine/core-modules/onboarding/onboarding.exception';
import { type ApplyTemplateResult } from 'src/engine/core-modules/onboarding/types/apply-template-operation.types';
import { WorkspaceTemplateService } from 'src/engine/core-modules/onboarding/workspace-template.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

describe('WorkspaceTemplateService', () => {
  let service: WorkspaceTemplateService;

  const workspaceId = 'workspace-id';
  const A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER =
    '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

  const buildRegistration = (
    id: string,
    manifest?: {
      application: {
        requiredServerVersionRange?: string | null;
        postInstallLogicFunction?: {
          universalIdentifier: string;
          shouldRunSynchronously?: boolean;
        };
      };
    },
  ) => ({ id, manifest }) as unknown as ApplicationRegistrationEntity;

  const buildStandardFlatViewMaps = () => ({
    byId: {},
    byUniversalIdentifier: {
      [STANDARD_OBJECTS.company.views.allCompanies.universalIdentifier]: {
        id: 'view-companies',
        universalIdentifier:
          STANDARD_OBJECTS.company.views.allCompanies.universalIdentifier,
        objectMetadataId: 'object-metadata-company',
        objectMetadataUniversalIdentifier:
          STANDARD_OBJECTS.company.universalIdentifier,
      },
      [STANDARD_OBJECTS.person.views.allPeople.universalIdentifier]: {
        id: 'view-people',
        universalIdentifier:
          STANDARD_OBJECTS.person.views.allPeople.universalIdentifier,
        objectMetadataId: 'object-metadata-person',
        objectMetadataUniversalIdentifier:
          STANDARD_OBJECTS.person.universalIdentifier,
      },
      [STANDARD_OBJECTS.opportunity.views.allOpportunities.universalIdentifier]:
        {
          id: 'view-opportunities',
          universalIdentifier:
            STANDARD_OBJECTS.opportunity.views.allOpportunities
              .universalIdentifier,
          objectMetadataId: 'object-metadata-opportunity',
          objectMetadataUniversalIdentifier:
            STANDARD_OBJECTS.opportunity.universalIdentifier,
        },
    },
  });

  // The navigation step is driven by current row state, not the hide-list: the
  // mock answers the navigation-menu-items read with the rows the workspace
  // still has, and the view read (only reached when restoring) with the
  // standard views the restore builder needs.
  const mockNavigationRowState = ({
    presentUniversalIdentifiers,
  }: {
    presentUniversalIdentifiers: string[];
  }) => {
    const byUniversalIdentifier = Object.fromEntries(
      presentUniversalIdentifiers.map((universalIdentifier) => [
        universalIdentifier,
        { id: `nav-${universalIdentifier}`, universalIdentifier },
      ]),
    );

    getOrRecompute.mockImplementation(
      (_workspaceId: string, cacheKeys: string[]) =>
        Promise.resolve(
          cacheKeys.includes('flatViewMaps')
            ? { flatViewMaps: buildStandardFlatViewMaps() }
            : { flatNavigationMenuItemMaps: { byUniversalIdentifier } },
        ),
    );
  };

  const resetNavigationRowState = () => {
    getOrRecompute.mockReset();
    getOrRecompute.mockResolvedValue({
      flatNavigationMenuItemMaps: { byUniversalIdentifier: {} },
    });
  };

  const workspaceUpdate = jest.fn().mockResolvedValue(undefined);
  const findOneByUniversalIdentifierGlobal = jest.fn();
  const installApplication = jest.fn().mockResolvedValue(true);
  const getOrRecompute = jest.fn().mockResolvedValue({
    flatNavigationMenuItemMaps: { byUniversalIdentifier: {} },
  });
  const findWorkspaceTwentyStandardAndCustomApplicationOrThrow = jest
    .fn()
    .mockResolvedValue({
      twentyStandardFlatApplication: {
        id: 'standard-app-id',
        universalIdentifier: 'standard-app-uid',
      },
    });
  const validateBuildAndRunWorkspaceMigration = jest
    .fn()
    .mockResolvedValue({ status: 'success' });
  const validateWorkspaceCompatibility = jest
    .fn()
    .mockResolvedValue({ compatible: true });
  const findByUniversalIdentifier = jest.fn().mockResolvedValue(null);
  const keyValuePairGet = jest.fn().mockResolvedValue([]);
  const keyValuePairSet = jest.fn().mockResolvedValue(undefined);

  const moduleRefGet = jest.fn();

  beforeEach(async () => {
    moduleRefGet.mockImplementation((token: unknown) => {
      if (token === ApplicationInstallService) {
        return { installApplication };
      }

      throw new Error(`Unexpected ModuleRef.get token: ${String(token)}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceTemplateService,
        {
          provide: getRepositoryToken(WorkspaceEntity),
          useValue: { update: workspaceUpdate },
        },
        {
          provide: ApplicationRegistrationService,
          useValue: { findOneByUniversalIdentifierGlobal },
        },
        {
          provide: ModuleRef,
          useValue: { get: moduleRefGet },
        },
        {
          provide: ApplicationService,
          useValue: {
            findWorkspaceTwentyStandardAndCustomApplicationOrThrow,
            findByUniversalIdentifier,
          },
        },
        {
          provide: WorkspaceCacheService,
          useValue: { getOrRecompute },
        },
        {
          provide: WorkspaceMigrationValidateBuildAndRunService,
          useValue: { validateBuildAndRunWorkspaceMigration },
        },
        {
          provide: ApplicationVersionValidationService,
          useValue: { validateWorkspaceCompatibility },
        },
        {
          provide: CacheLockService,
          useValue: {
            withLock: (fn: () => Promise<unknown>) => fn(),
          },
        },
        {
          provide: KeyValuePairService,
          useValue: { get: keyValuePairGet, set: keyValuePairSet },
        },
      ],
    }).compile();

    service = module.get<WorkspaceTemplateService>(WorkspaceTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // clearAllMocks keeps mockResolvedValue implementations; the persisted
    // operation store must start empty and the cached navigation rows empty
    // for every test.
    keyValuePairGet.mockReset().mockResolvedValue([]);
    resetNavigationRowState();
  });

  describe('applyWorkspaceTemplateOperation', () => {
    it('installs template apps, seeds no steps beyond the contract and records the template on the workspace', async () => {
      findOneByUniversalIdentifierGlobal.mockResolvedValue(
        buildRegistration('registration-1'),
      );

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-1',
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      expect(findOneByUniversalIdentifierGlobal).toHaveBeenCalledWith(
        A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
      );
      expect(installApplication).toHaveBeenCalledWith({
        appRegistrationId: 'registration-1',
        workspaceId,
      });
      expect(workspaceUpdate).toHaveBeenCalledWith(
        { id: workspaceId },
        { workspaceTemplate: WorkspaceTemplate.INDIVIDUAL },
      );
      expect(result.appliedTemplateKeyVersion).toEqual({
        key: WorkspaceTemplate.INDIVIDUAL,
        version: 1,
      });
      expect(result.steps.map((step) => step.status)).toEqual([
        'succeeded',
        'succeeded',
        'succeeded',
      ]);
    });

    it('reports sample seeding as failed with SEED_FAILED and retry info when a succeeded install carries an asynchronous post-install hook', async () => {
      findOneByUniversalIdentifierGlobal.mockImplementation(
        (universalIdentifier: string) =>
          Promise.resolve(
            buildRegistration(`registration-${universalIdentifier}`, {
              application: {
                requiredServerVersionRange: null,
                postInstallLogicFunction: {
                  universalIdentifier: 'post-install-uid',
                  shouldRunSynchronously: false,
                },
              },
            }),
          ),
      );

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-seed-1',
        template: WorkspaceTemplate.INDIVIDUAL,
        sampleContentEnabled: true,
      });

      const seedStep = result.steps.find(
        (step) => step.kind === 'seed-samples',
      );

      // The hook is only enqueued, so seeding has not run when the operation
      // resolves — reporting `succeeded` would fake a completed preset.
      expect(seedStep?.status).toBe('failed');
      expect(seedStep?.errorCode).toBe('SEED_FAILED');
      expect(seedStep?.localizedMessage).toContain('Retry');
    });

    it('reports sample seeding as succeeded only when the post-install hook ran synchronously during the install', async () => {
      findOneByUniversalIdentifierGlobal.mockImplementation(
        (universalIdentifier: string) =>
          Promise.resolve(
            buildRegistration(`registration-${universalIdentifier}`, {
              application: {
                requiredServerVersionRange: null,
                postInstallLogicFunction: {
                  universalIdentifier: 'post-install-uid',
                  shouldRunSynchronously: true,
                },
              },
            }),
          ),
      );

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-seed-sync',
        template: WorkspaceTemplate.INDIVIDUAL,
        sampleContentEnabled: true,
      });

      const seedStep = result.steps.find(
        (step) => step.kind === 'seed-samples',
      );

      expect(seedStep?.status).toBe('succeeded');
      expect(seedStep?.errorCode).toBeUndefined();
    });

    it('re-runs only the failed seed step on a same-key retry, without reinstalling apps or re-seeding content', async () => {
      const storedOperation: ApplyTemplateResult = {
        operationId: 'op-seed-retry',
        requestedTemplateKeyVersion: {
          key: WorkspaceTemplate.INDIVIDUAL,
          version: 1,
        },
        appliedTemplateKeyVersion: {
          key: WorkspaceTemplate.INDIVIDUAL,
          version: 1,
        },
        steps: [
          {
            kind: 'install-app',
            targetUniversalIdentifier: A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
            status: 'succeeded',
          },
          { kind: 'navigation-visibility', status: 'succeeded' },
          {
            kind: 'seed-samples',
            status: 'failed',
            errorCode: 'SEED_FAILED',
            localizedMessage: 'previous attempt',
          },
          { kind: 'set-workspace-template', status: 'succeeded' },
        ],
      };

      keyValuePairGet.mockResolvedValue([{ value: storedOperation }]);
      findOneByUniversalIdentifierGlobal.mockImplementation(
        (universalIdentifier: string) =>
          Promise.resolve(
            buildRegistration(`registration-${universalIdentifier}`, {
              application: {
                requiredServerVersionRange: null,
                postInstallLogicFunction: {
                  universalIdentifier: 'post-install-uid',
                  shouldRunSynchronously: false,
                },
              },
            }),
          ),
      );

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-seed-retry',
        template: WorkspaceTemplate.INDIVIDUAL,
        sampleContentEnabled: true,
      });

      // The succeeded install is returned as-is, so the app's post-install
      // hook is never re-enqueued and no sample content is duplicated.
      expect(installApplication).not.toHaveBeenCalled();
      expect(
        result.steps.find((step) => step.kind === 'install-app')?.status,
      ).toBe('succeeded');
      expect(
        result.steps.find((step) => step.kind === 'seed-samples')?.status,
      ).toBe('failed');
    });

    it('reports sample seeding as skipped when no succeeded install carries a post-install hook', async () => {
      findOneByUniversalIdentifierGlobal.mockResolvedValue(
        buildRegistration('registration-1'),
      );

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-seed-2',
        template: WorkspaceTemplate.INDIVIDUAL,
        sampleContentEnabled: true,
      });

      const seedStep = result.steps.find(
        (step) => step.kind === 'seed-samples',
      );

      expect(seedStep?.status).toBe('skipped');
    });

    it('never reports seeding as done when the only install failed', async () => {
      findOneByUniversalIdentifierGlobal.mockResolvedValue(null);

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-seed-3',
        template: WorkspaceTemplate.INDIVIDUAL,
        sampleContentEnabled: true,
      });

      const seedStep = result.steps.find(
        (step) => step.kind === 'seed-samples',
      );

      expect(seedStep?.status).toBe('skipped');
    });

    it('marks a missing app registration as a failed step with APP_NOT_REGISTERED instead of silently skipping', async () => {
      findOneByUniversalIdentifierGlobal.mockResolvedValue(null);

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-2',
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      const installStep = result.steps.find(
        (step) => step.kind === 'install-app',
      );

      expect(installStep?.status).toBe('failed');
      expect(installStep?.errorCode).toBe('APP_NOT_REGISTERED');
      // The template row is never claimed while a required install failed.
      expect(workspaceUpdate).not.toHaveBeenCalled();
      expect(result.appliedTemplateKeyVersion).toBeNull();
    });

    it('marks an incompatible app version as a failed step with VERSION_INCOMPATIBLE', async () => {
      findOneByUniversalIdentifierGlobal.mockResolvedValue(
        buildRegistration('registration-1', {
          application: { requiredServerVersionRange: '999.0.0' },
        }),
      );
      // One-shot: a persistent implementation would leak into later tests
      // since clearAllMocks keeps mock implementations.
      validateWorkspaceCompatibility.mockResolvedValueOnce({
        compatible: false,
        reason: 'WORKSPACE_INCOMPATIBLE',
        message: 'incompatible',
      });

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-3',
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      const installStep = result.steps.find(
        (step) => step.kind === 'install-app',
      );

      expect(installStep?.status).toBe('failed');
      expect(installStep?.errorCode).toBe('VERSION_INCOMPATIBLE');
      expect(installApplication).not.toHaveBeenCalled();
      expect(result.appliedTemplateKeyVersion).toBeNull();
    });

    it('returns the stored operation without reinstalling on same-key retry of a fully succeeded operation', async () => {
      const storedOperation: ApplyTemplateResult = {
        operationId: 'op-1',
        requestedTemplateKeyVersion: {
          key: WorkspaceTemplate.INDIVIDUAL,
          version: 1,
        },
        appliedTemplateKeyVersion: {
          key: WorkspaceTemplate.INDIVIDUAL,
          version: 1,
        },
        steps: [
          {
            kind: 'install-app',
            targetUniversalIdentifier: A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
            status: 'succeeded',
          },
          { kind: 'navigation-visibility', status: 'succeeded' },
          { kind: 'set-workspace-template', status: 'succeeded' },
        ],
      };

      keyValuePairGet.mockResolvedValue([{ value: storedOperation }]);

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-1',
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      expect(installApplication).not.toHaveBeenCalled();
      expect(workspaceUpdate).not.toHaveBeenCalled();
      expect(result).toEqual(storedOperation);
    });

    it('re-runs only failed steps on same-key retry and keeps succeeded ones', async () => {
      const storedOperation: ApplyTemplateResult = {
        operationId: 'op-2',
        requestedTemplateKeyVersion: {
          key: WorkspaceTemplate.INDIVIDUAL,
          version: 1,
        },
        appliedTemplateKeyVersion: null,
        steps: [
          {
            kind: 'install-app',
            targetUniversalIdentifier: A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
            status: 'failed',
            errorCode: 'APP_NOT_REGISTERED',
          },
          { kind: 'navigation-visibility', status: 'succeeded' },
          { kind: 'set-workspace-template', status: 'skipped' },
        ],
      };

      keyValuePairGet.mockResolvedValue([{ value: storedOperation }]);
      findOneByUniversalIdentifierGlobal.mockResolvedValue(
        buildRegistration('registration-1'),
      );

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-2',
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      expect(installApplication).toHaveBeenCalledTimes(1);
      // The previously succeeded navigation step is not re-executed.
      expect(validateBuildAndRunWorkspaceMigration).not.toHaveBeenCalled();
      expect(workspaceUpdate).toHaveBeenCalledWith(
        { id: workspaceId },
        { workspaceTemplate: WorkspaceTemplate.INDIVIDUAL },
      );
      expect(
        result.steps.find((step) => step.kind === 'install-app')?.status,
      ).toBe('succeeded');
      expect(
        result.steps.find((step) => step.kind === 'navigation-visibility')
          ?.status,
      ).toBe('succeeded');
    });

    it('rejects a same-key retry carrying a different template configuration', async () => {
      const storedOperation: ApplyTemplateResult = {
        operationId: 'op-4',
        requestedTemplateKeyVersion: {
          key: WorkspaceTemplate.INDIVIDUAL,
          version: 1,
        },
        appliedTemplateKeyVersion: null,
        steps: [],
      };

      keyValuePairGet.mockResolvedValue([{ value: storedOperation }]);

      await expect(
        service.applyWorkspaceTemplateOperation({
          workspaceId,
          idempotencyKey: 'op-4',
          template: WorkspaceTemplate.TEAM,
        }),
      ).rejects.toMatchObject({
        code: OnboardingExceptionCode.TEMPLATE_IDEMPOTENCY_CONFLICT,
      });
    });

    it('rejects a stale template version before running any step', async () => {
      await expect(
        service.applyWorkspaceTemplateOperation({
          workspaceId,
          idempotencyKey: 'op-5',
          template: WorkspaceTemplate.INDIVIDUAL,
          templateVersion: 99,
        }),
      ).rejects.toMatchObject({
        code: OnboardingExceptionCode.TEMPLATE_VERSION_CONFLICT,
      });

      expect(installApplication).not.toHaveBeenCalled();
    });

    it('rejects deselecting an app that is not optional', async () => {
      await expect(
        service.applyWorkspaceTemplateOperation({
          workspaceId,
          idempotencyKey: 'op-6',
          template: WorkspaceTemplate.INDIVIDUAL,
          deselectedOptionalAppUniversalIdentifiers: [
            A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
          ],
        }),
      ).rejects.toMatchObject({
        code: OnboardingExceptionCode.TEMPLATE_REQUIRED_APP_DESELECTED,
      });

      expect(installApplication).not.toHaveBeenCalled();
    });

    it('restores the managed CRM navigation rows a persona template hid when a later CRM setup runs', async () => {
      mockNavigationRowState({ presentUniversalIdentifiers: [] });

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-nav-restore',
        template: WorkspaceTemplate.CRM,
      });

      expect(
        result.steps.find((step) => step.kind === 'navigation-visibility')
          ?.status,
      ).toBe('succeeded');
      expect(validateBuildAndRunWorkspaceMigration).toHaveBeenCalledWith(
        expect.objectContaining({
          isSystemBuild: true,
          workspaceId,
          applicationUniversalIdentifier: 'standard-app-uid',
          allFlatEntityOperationByMetadataName: {
            navigationMenuItem: {
              flatEntityToCreate: [
                expect.objectContaining({
                  universalIdentifier: '20202020-b001-4b01-8b01-c0aba11c0001',
                }),
                expect.objectContaining({
                  universalIdentifier: '20202020-b005-4b05-8b05-c0aba11c0005',
                }),
                expect.objectContaining({
                  universalIdentifier: '20202020-b004-4b04-8b04-c0aba11c0004',
                }),
              ],
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
          },
        }),
      );
    });

    it('does not run the restore migration again once the managed rows were restored', async () => {
      mockNavigationRowState({
        presentUniversalIdentifiers: [
          '20202020-b001-4b01-8b01-c0aba11c0001',
          '20202020-b005-4b05-8b05-c0aba11c0005',
          '20202020-b004-4b04-8b04-c0aba11c0004',
        ],
      });

      const result = await service.applyWorkspaceTemplateOperation({
        workspaceId,
        idempotencyKey: 'op-nav-restore-idempotent',
        template: WorkspaceTemplate.CRM,
      });

      expect(
        result.steps.find((step) => step.kind === 'navigation-visibility')
          ?.status,
      ).toBe('succeeded');
      expect(validateBuildAndRunWorkspaceMigration).not.toHaveBeenCalled();
    });
  });

  describe('getWorkspaceTemplatePreview', () => {
    it('reports registration, compatibility, requirement and install state per app', async () => {
      findOneByUniversalIdentifierGlobal.mockResolvedValue(
        buildRegistration('registration-1', {
          application: { requiredServerVersionRange: '>=2.0.0' },
        }),
      );
      validateWorkspaceCompatibility.mockResolvedValue({
        compatible: true,
      });

      const preview = await service.getWorkspaceTemplatePreview({
        workspaceId,
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      expect(preview).toMatchObject({
        templateKey: WorkspaceTemplate.INDIVIDUAL,
        version: 1,
        blocked: false,
      });
      expect(preview.apps).toEqual([
        {
          universalIdentifier: A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
          displayName: A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
          registered: true,
          versionCompatible: true,
          required: true,
          currentlyInstalled: false,
        },
      ]);
      // The managed union is exactly the three rows this template hides, so
      // there is nothing to restore.
      expect(preview.navigationChanges).toHaveLength(3);
      expect(
        preview.navigationChanges.every(
          (navigationChange) => navigationChange.action === 'hide',
        ),
      ).toBe(true);
      // P1.6d persona bundle: the registered, compatible app's proposed
      // starter content is previewed.
      expect(preview.samples).toEqual([
        { label: 'Notes de réunion', locale: 'fr' },
        { label: 'Entretien individuel', locale: 'fr' },
      ]);
    });

    it('previews bundle contents only for ready apps', async () => {
      const accountingUniversalIdentifier =
        'b11a0000-0000-4000-8000-000000000001';

      // Accounting is unregistered on this server; documents is ready.
      findOneByUniversalIdentifierGlobal.mockImplementation(
        (universalIdentifier: string) =>
          Promise.resolve(
            universalIdentifier === accountingUniversalIdentifier
              ? null
              : buildRegistration('registration-documents'),
          ),
      );

      const preview = await service.getWorkspaceTemplatePreview({
        workspaceId,
        template: WorkspaceTemplate.NON_PROFIT,
      });

      // Only the documents bundle is proposed; the unready accounting bundle
      // is withheld instead of being previewed as if it would seed.
      expect(preview.samples).toEqual([
        { label: 'Notes de réunion', locale: 'fr' },
      ]);
      // The deferred Bilan contents are recorded, not silently dropped.
      expect(preview.blockedSamples).toEqual([
        { label: 'Dons', locale: 'fr', blockedBy: 'P7.0_SAFETY_GATE' },
        { label: 'Subventions', locale: 'fr', blockedBy: 'P7.0_SAFETY_GATE' },
        {
          label: 'Budget prévisionnel à l’équilibre',
          locale: 'fr',
          blockedBy: 'P7.0_SAFETY_GATE',
        },
        {
          label: 'Demande de subvention',
          locale: 'fr',
          blockedBy: 'P7.0_SAFETY_GATE',
        },
      ]);

      // mockImplementation is not cleared by jest.clearAllMocks; drop it so the
      // next test starts from the module default.
      findOneByUniversalIdentifierGlobal.mockReset();
    });

    it('excludes Bilan content even when Bilan is registered and compatible', async () => {
      // Bilan is ready on this server, but its proposed contents stay behind the
      // P7.0 gate: they must not appear as if the persona would seed them.
      findOneByUniversalIdentifierGlobal.mockImplementation(() =>
        Promise.resolve(buildRegistration('registration-ready')),
      );
      validateWorkspaceCompatibility.mockResolvedValue({ compatible: true });

      const preview = await service.getWorkspaceTemplatePreview({
        workspaceId,
        template: WorkspaceTemplate.NON_PROFIT,
      });

      expect(preview.samples).toEqual([
        { label: 'Notes de réunion', locale: 'fr' },
      ]);
      expect(
        preview.blockedSamples.every(
          (blockedSample) => blockedSample.blockedBy === 'P7.0_SAFETY_GATE',
        ),
      ).toBe(true);
      expect(preview.blockedSamples.map((sample) => sample.label)).toContain(
        'Dons',
      );

      findOneByUniversalIdentifierGlobal.mockReset();
    });

    it('previews no bundle contents for CRM-only', async () => {
      const preview = await service.getWorkspaceTemplatePreview({
        workspaceId,
        template: WorkspaceTemplate.CRM,
      });

      expect(preview.samples).toEqual([]);
      expect(preview.blockedSamples).toEqual([]);
      expect(preview.blocked).toBe(false);
    });

    it('flags blocked when a required app is not registered', async () => {
      findOneByUniversalIdentifierGlobal.mockResolvedValue(null);

      const preview = await service.getWorkspaceTemplatePreview({
        workspaceId,
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      expect(preview.blocked).toBe(true);
      expect(preview.apps[0]).toMatchObject({
        registered: false,
        versionCompatible: false,
        required: true,
      });
    });

    it('flags NO_APPS_AVAILABLE when a template expects apps but none are registered', async () => {
      findOneByUniversalIdentifierGlobal.mockResolvedValue(null);

      const preview = await service.getWorkspaceTemplatePreview({
        workspaceId,
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      expect(preview.errorCode).toBe('NO_APPS_AVAILABLE');
    });

    it('leaves the discriminator empty when at least one expected app is registered', async () => {
      findOneByUniversalIdentifierGlobal.mockResolvedValue(
        buildRegistration('registration-1'),
      );
      validateWorkspaceCompatibility.mockResolvedValue({ compatible: true });

      const preview = await service.getWorkspaceTemplatePreview({
        workspaceId,
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      expect(preview.errorCode).toBeNull();
    });

    it('never flags a CRM-only template as no-apps-available', async () => {
      const preview = await service.getWorkspaceTemplatePreview({
        workspaceId,
        template: WorkspaceTemplate.CRM,
      });

      expect(preview.errorCode).toBeNull();
    });
  });

  describe('navigation visibility', () => {
    it('hides CRM navigation rows for CRM-off templates', async () => {
      getOrRecompute.mockResolvedValue({
        flatNavigationMenuItemMaps: {
          byUniversalIdentifier: {
            '20202020-b001-4b01-8b01-c0aba11c0001': {
              id: 'nav-companies',
              universalIdentifier: '20202020-b001-4b01-8b01-c0aba11c0001',
            },
            '20202020-b002-4b02-8b02-c0aba11c0002': {
              id: 'nav-dashboards',
              universalIdentifier: '20202020-b002-4b02-8b02-c0aba11c0002',
            },
          },
        },
      });

      await service.applyWorkspaceTemplate({
        workspaceId,
        template: WorkspaceTemplate.INDIVIDUAL,
      });

      expect(validateBuildAndRunWorkspaceMigration).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId,
          allFlatEntityOperationByMetadataName: {
            navigationMenuItem: {
              flatEntityToCreate: [],
              flatEntityToDelete: [
                expect.objectContaining({
                  universalIdentifier: '20202020-b001-4b01-8b01-c0aba11c0001',
                }),
              ],
              flatEntityToUpdate: [],
            },
          },
        }),
      );
    });

    it('leaves navigation untouched for the CRM template', async () => {
      // Complete workspace: every managed row already exists, so the step
      // takes the no-op early return rather than the restore path. The
      // previous setup used an empty workspace, which only looked untouched
      // because the step was skipped outright — the defect this fixes.
      mockNavigationRowState({
        presentUniversalIdentifiers: [
          ...TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
        ],
      });

      await service.applyWorkspaceTemplate({
        workspaceId,
        template: WorkspaceTemplate.CRM,
      });

      expect(validateBuildAndRunWorkspaceMigration).not.toHaveBeenCalled();
    });
  });

  describe('preview and apply navigation agreement', () => {
    it('applies exactly the navigation changes the preview advertises for CRM, individual and student', async () => {
      const scenarios = [
        { template: WorkspaceTemplate.CRM, presentUniversalIdentifiers: [] },
        {
          template: WorkspaceTemplate.INDIVIDUAL,
          presentUniversalIdentifiers: [
            ...TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
          ],
        },
        {
          template: WorkspaceTemplate.STUDENT,
          presentUniversalIdentifiers: [
            ...TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
          ],
        },
      ];

      for (const scenario of scenarios) {
        validateBuildAndRunWorkspaceMigration.mockClear();

        const preview = await service.getWorkspaceTemplatePreview({
          workspaceId,
          template: scenario.template,
        });

        mockNavigationRowState({
          presentUniversalIdentifiers: scenario.presentUniversalIdentifiers,
        });

        await service.applyWorkspaceTemplate({
          workspaceId,
          template: scenario.template,
        });

        const navigationOperations = (
          validateBuildAndRunWorkspaceMigration.mock.calls[0]?.[0] as
            | {
                allFlatEntityOperationByMetadataName?: {
                  navigationMenuItem?: {
                    flatEntityToCreate?: {
                      universalIdentifier: string;
                    }[];
                    flatEntityToDelete?: {
                      universalIdentifier: string;
                    }[];
                  };
                };
              }
            | undefined
        )?.allFlatEntityOperationByMetadataName?.navigationMenuItem;

        const appliedCreates = [
          ...(navigationOperations?.flatEntityToCreate ?? []),
        ]
          .map((flatEntity) => flatEntity.universalIdentifier)
          .sort();
        const appliedDeletes = [
          ...(navigationOperations?.flatEntityToDelete ?? []),
        ]
          .map((flatEntity) => flatEntity.universalIdentifier)
          .sort();

        const previewHides = preview.navigationChanges
          .filter((navigationChange) => navigationChange.action === 'hide')
          .map((navigationChange) => navigationChange.universalIdentifier)
          .sort();
        const previewRestores = preview.navigationChanges
          .filter((navigationChange) => navigationChange.action === 'restore')
          .map((navigationChange) => navigationChange.universalIdentifier)
          .sort();

        expect(appliedDeletes).toEqual(previewHides);
        expect(appliedCreates).toEqual(previewRestores);
      }
    });
  });
});
