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
import { type ApplyTemplateResult } from 'src/engine/core-modules/onboarding/types/apply-template-operation.types';
import { WorkspaceTemplateService } from 'src/engine/core-modules/onboarding/workspace-template.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

// P1.6b idempotency proof at the unit level. The sibling service spec mocks
// CacheLockService.withLock through, so it cannot show that two callers racing
// on the same idempotency key still run a single operation. Here the lock is a
// real per-key serializer over a persisted operation store, which is the only
// contract the service relies on (the production lock is Redis).
describe('WorkspaceTemplateService idempotency and concurrency', () => {
  const workspaceId = 'workspace-id';
  const A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER =
    '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

  let service: WorkspaceTemplateService;
  let storedOperations: Map<string, { value: ApplyTemplateResult }>;
  let installApplication: jest.Mock;
  let workspaceUpdate: jest.Mock;
  let findOneByUniversalIdentifierGlobal: jest.Mock;

  const buildSerializingLock = () => {
    const tails = new Map<string, Promise<unknown>>();

    return <TData>(fn: () => Promise<TData>, key: string): Promise<TData> => {
      const tail = tails.get(key) ?? Promise.resolve();
      const result = tail.then(() => fn());

      // Swallow the outcome but keep the chain open so a rejected operation
      // still releases the next waiter, like the Redis lock's finally.
      tails.set(
        key,
        result.then(
          () => undefined,
          () => undefined,
        ),
      );

      return result;
    };
  };

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

  const buildModule = async () => {
    const keyValuePairGet = jest.fn(
      async ({
        workspaceId: storedWorkspaceId,
        key,
      }: {
        workspaceId: string;
        key: string;
      }) => {
        const stored = storedOperations.get(`${storedWorkspaceId}:${key}`);

        return stored ? [stored] : [];
      },
    );

    const keyValuePairSet = jest.fn(
      async ({
        workspaceId: storedWorkspaceId,
        key,
        value,
      }: {
        workspaceId: string;
        key: string;
        value: ApplyTemplateResult;
      }) => {
        storedOperations.set(`${storedWorkspaceId}:${key}`, { value });
      },
    );

    const serializingLock = buildSerializingLock();

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
          useValue: {
            validateWorkspaceCompatibility: jest
              .fn()
              .mockResolvedValue({ compatible: true }),
          },
        },
        {
          provide: CacheLockService,
          useValue: {
            withLock: (fn: () => Promise<unknown>, key: string) =>
              serializingLock(fn, key),
          },
        },
        {
          provide: KeyValuePairService,
          useValue: { get: keyValuePairGet, set: keyValuePairSet },
        },
      ],
    }).compile();

    service = module.get<WorkspaceTemplateService>(WorkspaceTemplateService);
  };

  const applyOperation = (
    idempotencyKey: string,
    sampleContentEnabled = false,
  ) =>
    service.applyWorkspaceTemplateOperation({
      workspaceId,
      idempotencyKey,
      template: WorkspaceTemplate.INDIVIDUAL,
      sampleContentEnabled,
    });

  beforeEach(async () => {
    storedOperations = new Map();
    installApplication = jest.fn().mockResolvedValue(true);
    workspaceUpdate = jest.fn().mockResolvedValue(undefined);
    findOneByUniversalIdentifierGlobal = jest
      .fn()
      .mockResolvedValue(buildRegistration('registration-1'));

    await buildModule();
  });

  it('installs each app and sets the template exactly once across N same-key retries, returning one stable result', async () => {
    const idempotencyKey = 'idempotent-retry';
    const firstResult = await applyOperation(idempotencyKey);
    const retryResults: ApplyTemplateResult[] = [];

    for (let attempt = 0; attempt < 3; attempt++) {
      retryResults.push(await applyOperation(idempotencyKey));
    }

    expect(installApplication).toHaveBeenCalledTimes(1);
    expect(workspaceUpdate).toHaveBeenCalledTimes(1);
    expect(firstResult.operationId).toBe(idempotencyKey);
    expect(firstResult.steps[0]).toMatchObject({
      kind: 'install-app',
      targetUniversalIdentifier: A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
      status: 'succeeded',
    });

    for (const retryResult of retryResults) {
      expect(retryResult).toEqual(firstResult);
      expect(retryResult.operationId).toBe(idempotencyKey);
      expect(retryResult.steps.map((step) => step.status)).toEqual([
        'succeeded',
        'succeeded',
        'succeeded',
      ]);
    }

    // One persisted progress record for the key — the record is a report, the
    // installed application state stays the activation truth (contract §5).
    expect(storedOperations.size).toBe(1);
    expect(installApplication).toHaveBeenCalledWith({
      appRegistrationId: 'registration-1',
      workspaceId,
    });
  });

  it('resolves concurrent same-key requests into a single operation execution shared by both callers', async () => {
    const idempotencyKey = 'idempotent-concurrent';

    const [firstResult, secondResult] = await Promise.all([
      applyOperation(idempotencyKey),
      applyOperation(idempotencyKey),
    ]);

    // The second caller waited for the lock, then read the persisted operation
    // instead of installing again.
    expect(installApplication).toHaveBeenCalledTimes(1);
    expect(workspaceUpdate).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(secondResult);
    expect(firstResult.operationId).toBe(idempotencyKey);
    expect(storedOperations.size).toBe(1);
  });

  it('does not re-resolve or re-run the sample-seeding step once it succeeded on the same key', async () => {
    findOneByUniversalIdentifierGlobal.mockResolvedValue(
      buildRegistration('registration-1', {
        application: {
          requiredServerVersionRange: null,
          postInstallLogicFunction: {
            universalIdentifier: 'post-install-uid',
            shouldRunSynchronously: true,
          },
        },
      }),
    );

    const idempotencyKey = 'idempotent-seed';
    const firstResult = await applyOperation(idempotencyKey, true);
    const registrationLookupsAfterFirstRun =
      findOneByUniversalIdentifierGlobal.mock.calls.length;

    expect(
      firstResult.steps.find((step) => step.kind === 'seed-samples')?.status,
    ).toBe('succeeded');

    const retryResult = await applyOperation(idempotencyKey, true);

    // The succeeded seeding step is returned from the store untouched, so no
    // re-resolution happens that could enqueue a second seed.
    expect(findOneByUniversalIdentifierGlobal.mock.calls.length).toBe(
      registrationLookupsAfterFirstRun,
    );
    expect(installApplication).toHaveBeenCalledTimes(1);
    expect(retryResult).toEqual(firstResult);
  });
});
