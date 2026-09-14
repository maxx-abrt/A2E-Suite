import { ModuleRef } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { ApplicationVersionValidationService } from 'src/engine/core-modules/application/application-package/application-version-validation.service';
import { type ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { KeyValuePairService } from 'src/engine/core-modules/key-value-pair/key-value-pair.service';
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
    manifest?: { application: { requiredServerVersionRange?: string | null } },
  ) => ({ id, manifest }) as unknown as ApplicationRegistrationEntity;

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
    // operation store must start empty for every test.
    keyValuePairGet.mockReset().mockResolvedValue([]);
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
      await service.applyWorkspaceTemplate({
        workspaceId,
        template: WorkspaceTemplate.CRM,
      });

      expect(validateBuildAndRunWorkspaceMigration).not.toHaveBeenCalled();
    });
  });
});
