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
import { type WorkspaceTemplateDefinition } from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import { type ApplyTemplateResult } from 'src/engine/core-modules/onboarding/types/apply-template-operation.types';
import { getWorkspaceTemplateDefinition } from 'src/engine/core-modules/onboarding/utils/get-workspace-template-definition.util';
import { WorkspaceTemplateService } from 'src/engine/core-modules/onboarding/workspace-template.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

// P1.6b partial-failure / resume contract proof at the unit level. The
// definitions ship no optional apps yet (product decision D02/P1.6d), so the
// optional-app path cannot be exercised through the real constant. Mocking the
// definition lookup is the only way to prove — without shipping content — that
// an unavailable optional app is excluded rather than failing the bundle.
jest.mock(
  'src/engine/core-modules/onboarding/utils/get-workspace-template-definition.util',
  () => ({
    getWorkspaceTemplateDefinition: jest.fn(),
  }),
);

const mockedGetWorkspaceTemplateDefinition =
  getWorkspaceTemplateDefinition as jest.MockedFunction<
    typeof getWorkspaceTemplateDefinition
  >;

describe('WorkspaceTemplateService partial failure and resume', () => {
  const workspaceId = 'workspace-id';
  const REQUIRED_APP_UNIVERSAL_IDENTIFIER = 'required-app-uid';
  const OPTIONAL_APP_UNIVERSAL_IDENTIFIER = 'optional-app-uid';

  let service: WorkspaceTemplateService;
  let storedOperation: ApplyTemplateResult | null;
  let installApplication: jest.Mock;
  let workspaceUpdate: jest.Mock;
  let findOneByUniversalIdentifierGlobal: jest.Mock;
  let validateWorkspaceCompatibility: jest.Mock;

  const definition: WorkspaceTemplateDefinition = {
    version: 1,
    applicationUniversalIdentifiers: [
      REQUIRED_APP_UNIVERSAL_IDENTIFIER,
      OPTIONAL_APP_UNIVERSAL_IDENTIFIER,
    ],
    optionalApplicationUniversalIdentifiers: [
      OPTIONAL_APP_UNIVERSAL_IDENTIFIER,
    ],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [],
    sampleContentEnabled: false,
    starterBundleContents: [],
    blockedStarterBundleContents: [],
  };

  const buildRegistration = (
    universalIdentifier: string,
  ): ApplicationRegistrationEntity =>
    ({
      id: `registration-${universalIdentifier}`,
      manifest: { application: { universalIdentifier } },
    }) as unknown as ApplicationRegistrationEntity;

  const buildModule = async () => {
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
          useValue: {
            get: (token: unknown) => {
              if (token === ApplicationInstallService) {
                return { installApplication };
              }

              throw new Error(
                `Unexpected ModuleRef.get token: ${String(token)}`,
              );
            },
          },
        },
        {
          provide: ApplicationService,
          useValue: {
            findWorkspaceTwentyStandardAndCustomApplicationOrThrow: jest
              .fn()
              .mockResolvedValue({
                twentyStandardFlatApplication: {
                  id: 'standard-app-id',
                  universalIdentifier: 'standard-app-uid',
                },
              }),
            findByUniversalIdentifier: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: WorkspaceCacheService,
          useValue: {
            getOrRecompute: jest.fn().mockResolvedValue({
              flatNavigationMenuItemMaps: { byUniversalIdentifier: {} },
            }),
          },
        },
        {
          provide: WorkspaceMigrationValidateBuildAndRunService,
          useValue: {
            validateBuildAndRunWorkspaceMigration: jest
              .fn()
              .mockResolvedValue({ status: 'success' }),
          },
        },
        {
          provide: ApplicationVersionValidationService,
          useValue: { validateWorkspaceCompatibility },
        },
        {
          provide: CacheLockService,
          useValue: { withLock: (fn: () => Promise<unknown>) => fn() },
        },
        {
          provide: KeyValuePairService,
          useValue: {
            get: jest.fn(async () =>
              storedOperation ? [{ value: storedOperation }] : [],
            ),
            set: jest.fn(async ({ value }: { value: ApplyTemplateResult }) => {
              storedOperation = value;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WorkspaceTemplateService>(WorkspaceTemplateService);
  };

  const applyOperation = (idempotencyKey: string) =>
    service.applyWorkspaceTemplateOperation({
      workspaceId,
      idempotencyKey,
      template: WorkspaceTemplate.NON_PROFIT,
    });

  const findInstallStep = (result: ApplyTemplateResult, uid: string) =>
    result.steps.find(
      (step) =>
        step.kind === 'install-app' && step.targetUniversalIdentifier === uid,
    );

  beforeEach(async () => {
    storedOperation = null;
    installApplication = jest.fn().mockResolvedValue(true);
    workspaceUpdate = jest.fn().mockResolvedValue(undefined);
    validateWorkspaceCompatibility = jest
      .fn()
      .mockResolvedValue({ compatible: true });
    findOneByUniversalIdentifierGlobal = jest
      .fn()
      .mockImplementation((universalIdentifier: string) =>
        Promise.resolve(buildRegistration(universalIdentifier)),
      );

    mockedGetWorkspaceTemplateDefinition.mockReturnValue(definition);

    await buildModule();
  });

  it('attempts required and non-deselected optional apps, keeping partial results when one install fails', async () => {
    installApplication.mockImplementation(
      ({ appRegistrationId }: { appRegistrationId: string }) =>
        appRegistrationId ===
        `registration-${REQUIRED_APP_UNIVERSAL_IDENTIFIER}`
          ? Promise.reject(new Error('install pipeline exploded'))
          : Promise.resolve(true),
    );

    const result = await applyOperation('partial-required-failure');

    // Both apps were attempted; the required failure is named with a safe,
    // typed, retry-oriented error and the succeeded optional work is kept.
    expect(installApplication).toHaveBeenCalledTimes(2);
    expect(
      findInstallStep(result, REQUIRED_APP_UNIVERSAL_IDENTIFIER),
    ).toMatchObject({
      status: 'failed',
      errorCode: 'INSTALL_FAILED',
    });
    expect(
      findInstallStep(result, REQUIRED_APP_UNIVERSAL_IDENTIFIER)
        ?.localizedMessage,
    ).toBeDefined();
    expect(
      findInstallStep(result, OPTIONAL_APP_UNIVERSAL_IDENTIFIER),
    ).toMatchObject({ status: 'succeeded' });

    // A failed required app blocks claiming the preset: no fake completed
    // preset, no template row write.
    expect(
      result.steps.find((step) => step.kind === 'set-workspace-template')
        ?.status,
    ).toBe('skipped');
    expect(result.appliedTemplateKeyVersion).toBeNull();
    expect(workspaceUpdate).not.toHaveBeenCalled();
  });

  it('excludes an unavailable optional app instead of failing the bundle', async () => {
    findOneByUniversalIdentifierGlobal.mockImplementation(
      (universalIdentifier: string) =>
        Promise.resolve(
          universalIdentifier === OPTIONAL_APP_UNIVERSAL_IDENTIFIER
            ? null
            : buildRegistration(universalIdentifier),
        ),
    );

    const result = await applyOperation('optional-unavailable');

    // The optional app failed with a typed code but does not block the bundle:
    // the required work is kept and the template is applied without it.
    expect(
      findInstallStep(result, OPTIONAL_APP_UNIVERSAL_IDENTIFIER),
    ).toMatchObject({ status: 'failed', errorCode: 'APP_NOT_REGISTERED' });
    expect(
      findInstallStep(result, REQUIRED_APP_UNIVERSAL_IDENTIFIER),
    ).toMatchObject({ status: 'succeeded' });
    expect(
      result.steps.find((step) => step.kind === 'set-workspace-template')
        ?.status,
    ).toBe('succeeded');
    expect(result.appliedTemplateKeyVersion).toEqual({
      key: WorkspaceTemplate.NON_PROFIT,
      version: 1,
    });
    expect(workspaceUpdate).toHaveBeenCalledWith(
      { id: workspaceId },
      { workspaceTemplate: WorkspaceTemplate.NON_PROFIT },
    );
  });

  it('resumes on the same key, revalidating the version of the previously failed app only', async () => {
    // First attempt: the required app is version-incompatible.
    validateWorkspaceCompatibility
      .mockResolvedValueOnce({
        compatible: false,
        reason: 'WORKSPACE_INCOMPATIBLE',
        message: 'incompatible',
      })
      .mockResolvedValueOnce({ compatible: true });

    const firstResult = await applyOperation('resume-revalidation');
    const failedInstallStep = findInstallStep(
      firstResult,
      REQUIRED_APP_UNIVERSAL_IDENTIFIER,
    );

    expect(failedInstallStep).toMatchObject({
      status: 'failed',
      errorCode: 'VERSION_INCOMPATIBLE',
    });
    expect(installApplication).toHaveBeenCalledTimes(1);

    // Second attempt: the server now ships a compatible version. Resume must
    // re-validate compatibility for the failed app before re-installing it.
    validateWorkspaceCompatibility.mockClear();
    installApplication.mockClear();

    const retryResult = await applyOperation('resume-revalidation');

    expect(validateWorkspaceCompatibility).toHaveBeenCalledTimes(1);
    expect(installApplication).toHaveBeenCalledTimes(1);
    expect(installApplication).toHaveBeenCalledWith({
      appRegistrationId: `registration-${REQUIRED_APP_UNIVERSAL_IDENTIFIER}`,
      workspaceId,
    });
    // The succeeded optional install is returned untouched — no duplicate
    // install and therefore no duplicate seed.
    expect(
      findInstallStep(retryResult, OPTIONAL_APP_UNIVERSAL_IDENTIFIER),
    ).toMatchObject({ status: 'succeeded' });
    expect(
      findInstallStep(retryResult, REQUIRED_APP_UNIVERSAL_IDENTIFIER),
    ).toMatchObject({ status: 'succeeded' });
    expect(
      retryResult.steps.find((step) => step.kind === 'set-workspace-template')
        ?.status,
    ).toBe('succeeded');
  });

  it('skips deselected optional steps without discarding the operation result', async () => {
    const result = await service.applyWorkspaceTemplateOperation({
      workspaceId,
      idempotencyKey: 'optional-deselected',
      template: WorkspaceTemplate.NON_PROFIT,
      deselectedOptionalAppUniversalIdentifiers: [
        OPTIONAL_APP_UNIVERSAL_IDENTIFIER,
      ],
    });

    // The deselected optional app is not part of the operation at all, and its
    // absence never turns the bundle into a failure.
    expect(
      findInstallStep(result, OPTIONAL_APP_UNIVERSAL_IDENTIFIER),
    ).toBeUndefined();
    expect(installApplication).toHaveBeenCalledTimes(1);
    expect(
      result.steps.find((step) => step.kind === 'set-workspace-template')
        ?.status,
    ).toBe('succeeded');
    expect(result.appliedTemplateKeyVersion).toEqual({
      key: WorkspaceTemplate.NON_PROFIT,
      version: 1,
    });
  });

  it('never reports the preset applied while a required step is still pending after a partial run', async () => {
    installApplication.mockRejectedValue(new Error('transient failure'));

    const result = await applyOperation('partial-both-failed');

    // Every required install failed and nothing was seeded: the operation keeps
    // the step report but withholds appliedTemplateKeyVersion.
    expect(result.appliedTemplateKeyVersion).toBeNull();
    expect(
      result.steps.every(
        (step) =>
          step.kind !== 'set-workspace-template' || step.status === 'skipped',
      ),
    ).toBe(true);
  });
});
