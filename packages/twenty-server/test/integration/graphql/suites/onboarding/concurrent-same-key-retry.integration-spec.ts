import gql from 'graphql-tag';
import { v4 as uuidv4 } from 'uuid';

import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';

import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

// P1.6b concurrency proof: the unit spec mocks CacheLockService.withLock
// through, so it cannot show that the *real* Redis lock serializes two
// same-key requests. This suite runs the mutation against the real test DB
// and the real lock, then asserts a single operation outcome.
//
// The template apps are registered as LOCAL: ApplicationInstallService skips
// the tarball pipeline for LOCAL registrations and returns success, so the
// install step runs for real without needing a published package. The tests
// use TEAM (no hidden navigation rows) and NON_PROFIT (both hidden lists are
// empty) so the shared seeded workspace navigation is never mutated.
const A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';
const A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER =
  'b11a0000-0000-4000-8000-000000000001';
const POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  'c2e00000-0000-4000-8000-000000000001';

type TemplateKey = 'TEAM' | 'NON_PROFIT';

type ApplyStepPayload = {
  kind: string;
  targetUniversalIdentifier?: string | null;
  status: string;
  errorCode?: string | null;
  localizedMessage?: string | null;
};

type ApplyResultPayload = {
  operationId: string;
  requestedTemplateKeyVersion: { key: string; version: number } | null;
  appliedTemplateKeyVersion: { key: string; version: number } | null;
  steps: ApplyStepPayload[];
};

const applyOperationMutation = gql`
  mutation ConcurrentApplyWorkspaceTemplate(
    $input: ApplyWorkspaceTemplateOperationInput!
  ) {
    applyWorkspaceTemplateOperation(input: $input) {
      operationId
      requestedTemplateKeyVersion {
        key
        version
      }
      appliedTemplateKeyVersion {
        key
        version
      }
      steps {
        kind
        targetUniversalIdentifier
        status
        errorCode
        localizedMessage
      }
    }
  }
`;

const applyOperation = async ({
  idempotencyKey,
  template,
  sampleContentEnabled,
}: {
  idempotencyKey: string;
  template: TemplateKey;
  sampleContentEnabled?: boolean;
}): Promise<ApplyResultPayload> => {
  const response = await makeMetadataAPIRequest({
    query: applyOperationMutation,
    variables: {
      input: { idempotencyKey, template, sampleContentEnabled },
    },
  });

  expect(response.body.errors).toBeUndefined();

  return response.body.data
    .applyWorkspaceTemplateOperation as ApplyResultPayload;
};

const deleteApplicationRows = async (universalIdentifier: string) => {
  await testDataSource.query(
    `DELETE FROM core."application" WHERE "universalIdentifier" = $1`,
    [universalIdentifier],
  );
  await testDataSource.query(
    `DELETE FROM core."applicationRegistration" WHERE "universalIdentifier" = $1`,
    [universalIdentifier],
  );
};

const registerLocalApplication = async ({
  universalIdentifier,
  withPostInstallHook,
}: {
  universalIdentifier: string;
  withPostInstallHook: boolean;
}): Promise<string> => {
  // Idempotent setup: drop anything an aborted run may have left registered
  // under the same universal identifier.
  await deleteApplicationRows(universalIdentifier);

  const response = await makeMetadataAPIRequest({
    query: gql`
      mutation RegisterConcurrencyTestApp(
        $input: CreateApplicationRegistrationInput!
      ) {
        createApplicationRegistration(input: $input) {
          applicationRegistration {
            id
          }
        }
      }
    `,
    variables: {
      input: {
        name: `Concurrency test app ${universalIdentifier.slice(0, 8)}`,
        universalIdentifier,
      },
    },
  });

  expect(response.body.errors).toBeUndefined();

  const manifest = {
    application: {
      universalIdentifier,
      ...(withPostInstallHook
        ? {
            postInstallLogicFunction: {
              universalIdentifier:
                POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
            },
          }
        : {}),
    },
  };

  await testDataSource.query(
    `UPDATE core."applicationRegistration"
     SET "sourceType" = 'local', "manifest" = $1::jsonb
     WHERE "universalIdentifier" = $2`,
    [JSON.stringify(manifest), universalIdentifier],
  );

  const registrationRows = await testDataSource.query(
    `SELECT id FROM core."applicationRegistration" WHERE "universalIdentifier" = $1`,
    [universalIdentifier],
  );

  return registrationRows[0].id as string;
};

const countStoredOperations = async (idempotencyKey: string) => {
  const rows = await testDataSource.query(
    `SELECT id FROM core."keyValuePair" WHERE "workspaceId" = $1 AND key = $2`,
    [SEED_APPLE_WORKSPACE_ID, `template-operation:${idempotencyKey}`],
  );

  return rows.length;
};

const readWorkspaceTemplate = async (): Promise<string | null> => {
  const rows = await testDataSource.query(
    `SELECT "workspaceTemplate" FROM core."workspace" WHERE id = $1`,
    [SEED_APPLE_WORKSPACE_ID],
  );

  return rows[0]?.workspaceTemplate ?? null;
};

// The class is resolved by name from the Nest container rather than imported:
// application-install.service.ts transitively pulls an ESM-only optional
// dependency jest's resolver cannot load from a test file's static graph.
type ApplicationInstallServiceLike = {
  installApplication: (params: {
    appRegistrationId: string;
    workspaceId: string;
  }) => Promise<boolean>;
};

let previousWorkspaceTemplate: string | null = null;
let installApplicationSpy: jest.SpyInstance;

beforeAll(async () => {
  previousWorkspaceTemplate = await readWorkspaceTemplate();

  // LOCAL registration + call-through spy: the real install method still runs
  // (and no-ops for LOCAL), only the call count is recorded. That count is the
  // direct evidence that concurrent same-key requests ran one operation.
  installApplicationSpy = jest.spyOn(
    getAppProviderByClassName<ApplicationInstallServiceLike>(
      'ApplicationInstallService',
    ),
    'installApplication',
  );

  await registerLocalApplication({
    universalIdentifier: A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    withPostInstallHook: true,
  });
}, 60000);

afterAll(async () => {
  installApplicationSpy.mockRestore();

  await testDataSource.query(
    `UPDATE core."workspace" SET "workspaceTemplate" = $1 WHERE id = $2`,
    [previousWorkspaceTemplate, SEED_APPLE_WORKSPACE_ID],
  );
  await testDataSource.query(
    `DELETE FROM core."keyValuePair" WHERE "workspaceId" = $1 AND key LIKE 'template-operation:%'`,
    [SEED_APPLE_WORKSPACE_ID],
  );
  // Registration rows are global, not workspace-scoped: leaving them behind
  // would make the P1.7c unavailable-apps suite see apps as registered.
  await deleteApplicationRows(A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER);
  await deleteApplicationRows(A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER);
}, 60000);

describe('concurrent same-key setup-operation retry (real DB + real CacheLock)', () => {
  it('serializes concurrent same-key requests into exactly one operation outcome', async () => {
    const idempotencyKey = uuidv4();

    const [firstResult, secondResult] = await Promise.all([
      applyOperation({
        idempotencyKey,
        template: 'TEAM',
        sampleContentEnabled: true,
      }),
      applyOperation({
        idempotencyKey,
        template: 'TEAM',
        sampleContentEnabled: true,
      }),
    ]);

    // The lock let only the first request run the install step; the second
    // acquired the lock afterwards and resumed the persisted operation.
    expect(installApplicationSpy).toHaveBeenCalledTimes(1);

    expect(firstResult).toEqual(secondResult);
    expect(firstResult.appliedTemplateKeyVersion).toEqual({
      key: 'TEAM',
      version: 1,
    });

    const installSteps = firstResult.steps.filter(
      (step) => step.kind === 'INSTALL_APP',
    );

    expect(installSteps).toHaveLength(1);
    expect(installSteps[0]).toMatchObject({
      targetUniversalIdentifier: A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      status: 'SUCCEEDED',
    });

    // The post-install hook is asynchronous, so seeding has not run when the
    // operation resolves: the step truthfully reports SEED_FAILED rather than
    // a fake success. The succeeded install is returned as-is from the
    // persisted operation, so the hook is never re-enqueued.
    expect(
      firstResult.steps.find((step) => step.kind === 'SEED_SAMPLES'),
    ).toMatchObject({
      status: 'FAILED',
      errorCode: 'SEED_FAILED',
    });

    expect(await countStoredOperations(idempotencyKey)).toBe(1);
    expect(await readWorkspaceTemplate()).toBe('TEAM');
  });

  it('captures registration failure per step and retries only failed steps on the same key', async () => {
    await deleteApplicationRows(
      A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
    );
    installApplicationSpy.mockClear();
    const idempotencyKey = uuidv4();

    const firstResult = await applyOperation({
      idempotencyKey,
      template: 'NON_PROFIT',
      sampleContentEnabled: true,
    });

    // Only the registered documents app was installed; accounting failed.
    expect(installApplicationSpy).toHaveBeenCalledTimes(1);
    expect(
      firstResult.steps.find(
        (step) =>
          step.kind === 'INSTALL_APP' &&
          step.targetUniversalIdentifier ===
            A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      )?.status,
    ).toBe('SUCCEEDED');
    expect(
      firstResult.steps.find(
        (step) =>
          step.kind === 'INSTALL_APP' &&
          step.targetUniversalIdentifier ===
            A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
      ),
    ).toMatchObject({
      status: 'FAILED',
      errorCode: 'APP_NOT_REGISTERED',
    });
    expect(firstResult.appliedTemplateKeyVersion).toBeNull();
    expect(
      firstResult.steps.find((step) => step.kind === 'SET_WORKSPACE_TEMPLATE')
        ?.status,
    ).toBe('SKIPPED');

    const accountingRegistrationId = await registerLocalApplication({
      universalIdentifier: A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
      withPostInstallHook: false,
    });

    installApplicationSpy.mockClear();

    const retryResult = await applyOperation({
      idempotencyKey,
      template: 'NON_PROFIT',
      sampleContentEnabled: true,
    });

    // Exactly one re-install, for the previously failed accounting app; the
    // succeeded documents install is returned as-is (no duplicate install and
    // therefore no re-seeded content).
    expect(installApplicationSpy).toHaveBeenCalledTimes(1);
    expect(installApplicationSpy).toHaveBeenCalledWith({
      appRegistrationId: accountingRegistrationId,
      workspaceId: SEED_APPLE_WORKSPACE_ID,
    });

    expect(
      retryResult.steps.find(
        (step) =>
          step.kind === 'INSTALL_APP' &&
          step.targetUniversalIdentifier ===
            A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      )?.status,
    ).toBe('SUCCEEDED');
    expect(
      retryResult.steps.find(
        (step) =>
          step.kind === 'INSTALL_APP' &&
          step.targetUniversalIdentifier ===
            A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
      )?.status,
    ).toBe('SUCCEEDED');
    expect(retryResult.appliedTemplateKeyVersion).toEqual({
      key: 'NON_PROFIT',
      version: 1,
    });
    expect(await readWorkspaceTemplate()).toBe('NON_PROFIT');

    // Retrying again re-installs nothing: only the non-succeeded (async seed)
    // step is re-resolved, which never enqueues the hook itself.
    installApplicationSpy.mockClear();

    const thirdResult = await applyOperation({
      idempotencyKey,
      template: 'NON_PROFIT',
      sampleContentEnabled: true,
    });

    expect(installApplicationSpy).not.toHaveBeenCalled();
    expect(thirdResult).toEqual(retryResult);
  });
});
