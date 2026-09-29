import { type QueryRunner } from 'typeorm';

import { getAppProviderByName } from 'test/integration/utils/get-app-provider-by-name.util';

import { CreateWorkspaceAiProviderFastInstanceCommand } from 'src/database/commands/upgrade-version-command/2-39/2-39-instance-command-fast-1790711712877-create-workspace-ai-provider';
import { AiExceptionCode } from 'src/engine/metadata-modules/ai/ai.exception';
import { type ProviderConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/provider-config.service';
import { type WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

const WORKSPACE_AI_PROVIDER_TABLE = 'core."workspaceAiProvider"';
const PLAINTEXT_API_KEY = 'sk-byok-integration-test-key';
const AI_MODELS_MODULE_NAME = 'AiModelsModule';

describe('Workspace AI provider BYOK (integration)', () => {
  let providerConfigService: ProviderConfigService;
  let workspaceAiProviderService: WorkspaceAiProviderService;
  let queryRunner: QueryRunner;
  let createdTable = false;

  const deleteWorkspaceProviders = () =>
    global.testDataSource.query(
      `DELETE FROM ${WORKSPACE_AI_PROVIDER_TABLE} WHERE "workspaceId" IN ($1, $2)`,
      [SEED_APPLE_WORKSPACE_ID, SEED_YCOMBINATOR_WORKSPACE_ID],
    );

  beforeAll(async () => {
    providerConfigService = getAppProviderByName<ProviderConfigService>({
      moduleName: AI_MODELS_MODULE_NAME,
      providerName: 'ProviderConfigService',
    });
    workspaceAiProviderService =
      getAppProviderByName<WorkspaceAiProviderService>({
        moduleName: AI_MODELS_MODULE_NAME,
        providerName: 'WorkspaceAiProviderService',
      });
    queryRunner = global.testDataSource.createQueryRunner();

    const [{ tableExists }] = await global.testDataSource.query(
      `SELECT to_regclass($1) IS NOT NULL AS "tableExists"`,
      [WORKSPACE_AI_PROVIDER_TABLE],
    );

    if (!tableExists) {
      await new CreateWorkspaceAiProviderFastInstanceCommand().up(queryRunner);
      createdTable = true;
    }

    await deleteWorkspaceProviders();
  });

  afterAll(async () => {
    await deleteWorkspaceProviders();

    if (createdTable) {
      await new CreateWorkspaceAiProviderFastInstanceCommand().down(
        queryRunner,
      );
    }

    await queryRunner.release();
  });

  it('stores the API key as ciphertext at rest and never as plaintext', async () => {
    await workspaceAiProviderService.upsertProvider({
      workspaceId: SEED_APPLE_WORKSPACE_ID,
      provider: 'openai',
      npm: '@ai-sdk/openai',
      label: 'OpenAI',
      apiKey: PLAINTEXT_API_KEY,
      defaultModel: 'gpt-4o',
      fastModel: 'gpt-4o-mini',
    });

    const [row] = await global.testDataSource.query(
      `SELECT "encryptedApiKey", "defaultModel", "fastModel" FROM ${WORKSPACE_AI_PROVIDER_TABLE} WHERE "workspaceId" = $1 AND "provider" = 'openai'`,
      [SEED_APPLE_WORKSPACE_ID],
    );

    expect(row.encryptedApiKey).toMatch(/^enc:v2:/);
    expect(row.encryptedApiKey).not.toContain(PLAINTEXT_API_KEY);
    expect(row.defaultModel).toBe('gpt-4o');
    expect(row.fastModel).toBe('gpt-4o-mini');
  });

  it('does not leak the workspace provider to another workspace', async () => {
    const appleProviders = await workspaceAiProviderService.resolveProviders(
      SEED_APPLE_WORKSPACE_ID,
    );
    const yCombinatorProviders =
      await workspaceAiProviderService.resolveProviders(
        SEED_YCOMBINATOR_WORKSPACE_ID,
      );

    expect(appleProviders).toHaveLength(1);
    expect(appleProviders[0].providerConfig.apiKey).toBe(PLAINTEXT_API_KEY);
    expect(yCombinatorProviders).toHaveLength(0);

    const yCombinatorResolved =
      await providerConfigService.getResolvedProvidersForWorkspace({
        workspaceId: SEED_YCOMBINATOR_WORKSPACE_ID,
      });

    expect(yCombinatorResolved.openai?.apiKey).not.toBe(PLAINTEXT_API_KEY);
  });

  it('throws a safe error when the stored key cannot be decrypted', async () => {
    await global.testDataSource.query(
      `UPDATE ${WORKSPACE_AI_PROVIDER_TABLE} SET "encryptedApiKey" = 'not-an-envelope' WHERE "workspaceId" = $1 AND "provider" = 'openai'`,
      [SEED_APPLE_WORKSPACE_ID],
    );

    const resolution = workspaceAiProviderService.resolveProviders(
      SEED_APPLE_WORKSPACE_ID,
    );

    await expect(resolution).rejects.toMatchObject({
      code: AiExceptionCode.API_KEY_NOT_CONFIGURED,
    });
    await expect(resolution).rejects.not.toThrow('not-an-envelope');
  });

  it('falls back to the instance providers then the catalog once the workspace key is removed', async () => {
    await workspaceAiProviderService.upsertProvider({
      workspaceId: SEED_APPLE_WORKSPACE_ID,
      provider: 'openai',
      npm: '@ai-sdk/openai',
      apiKey: PLAINTEXT_API_KEY,
    });

    const withWorkspaceKey =
      await providerConfigService.getResolvedProvidersForWorkspace({
        workspaceId: SEED_APPLE_WORKSPACE_ID,
      });

    expect(withWorkspaceKey.openai.apiKey).toBe(PLAINTEXT_API_KEY);

    await workspaceAiProviderService.removeProvider({
      workspaceId: SEED_APPLE_WORKSPACE_ID,
      provider: 'openai',
    });

    const afterRemoval =
      await providerConfigService.getResolvedProvidersForWorkspace({
        workspaceId: SEED_APPLE_WORKSPACE_ID,
      });
    const instanceResolution = providerConfigService.getResolvedProviders();

    expect(afterRemoval.openai?.apiKey).not.toBe(PLAINTEXT_API_KEY);
    expect(afterRemoval.openai?.apiKey).toBe(instanceResolution.openai?.apiKey);
  });

  it('keeps the workspace provider even when instance custom providers are disabled', async () => {
    await workspaceAiProviderService.upsertProvider({
      workspaceId: SEED_APPLE_WORKSPACE_ID,
      provider: 'openai',
      npm: '@ai-sdk/openai',
      apiKey: PLAINTEXT_API_KEY,
    });

    const resolvedWithCustomProvidersDisabled =
      await providerConfigService.getResolvedProvidersForWorkspace({
        workspaceId: SEED_APPLE_WORKSPACE_ID,
        includeCustomProviders: false,
      });

    expect(resolvedWithCustomProvidersDisabled.openai.apiKey).toBe(
      PLAINTEXT_API_KEY,
    );
  });
});
