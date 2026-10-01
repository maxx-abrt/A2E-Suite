import { type AiProviderConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.type';
import { type AiProvidersConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-providers-config.type';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { type AiModelPreferencesService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-preferences.service';
import { type ConfigGroupHashService } from 'src/engine/core-modules/twenty-config/services/config-group-hash.service';
import { type CustomAiProviderAccessService } from 'src/engine/core-modules/enterprise/services/custom-ai-provider-access.service';
import { type ProviderConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/provider-config.service';
import { type SdkProviderFactoryService } from 'src/engine/metadata-modules/ai/ai-models/services/sdk-provider-factory.service';

const WORKSPACE_A = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const WORKSPACE_B = '20202020-1c25-4d02-bf25-6aeccf7ea420';

const buildInstance = (label: string, config: AiProviderConfig) => ({
  createModel: (modelId: string) => ({
    __label: label,
    __apiKey: config.apiKey,
    modelId,
  }),
  rawProvider: { __label: label, apiKey: config.apiKey },
  sdkPackage: config.npm,
});

const OPENAI_MODELS = [{ name: 'gpt-4o', label: 'GPT-4o' }];

const buildRegistry = () => {
  const providerConfigService = {
    getResolvedProviders: jest.fn(),
    getWorkspaceProviderResolution: jest.fn(),
    getCatalogProviderNames: jest.fn(() => new Set<string>()),
  };

  const sdkProviderFactory = {
    createProvider: jest.fn((_providerName: string, config: AiProviderConfig) =>
      buildInstance('instance', config),
    ),
    createTransientProvider: jest.fn((config: AiProviderConfig) =>
      buildInstance('workspace', config),
    ),
    clearCache: jest.fn(),
  };

  const preferencesService = {
    getPreferences: jest.fn(() => ({
      defaultFastModels: [],
      defaultSmartModels: [],
      recommendedModels: [],
      disabledModels: [],
    })),
    getRecommendedModelIds: jest.fn(() => new Set<string>()),
  };

  const configGroupHashService = {
    computeHash: jest.fn(() => 'hash'),
  };

  const customAiProviderAccessService = {
    getCachedHasAccess: jest.fn(() => true),
  };

  const registry = new AiModelRegistryService(
    providerConfigService as unknown as ProviderConfigService,
    sdkProviderFactory as unknown as SdkProviderFactoryService,
    preferencesService as unknown as AiModelPreferencesService,
    configGroupHashService as unknown as ConfigGroupHashService,
    customAiProviderAccessService as unknown as CustomAiProviderAccessService,
  );

  return { registry, providerConfigService, sdkProviderFactory };
};

describe('AiModelRegistryService workspace resolution', () => {
  const instanceProviders: AiProvidersConfig = {
    openai: {
      npm: '@ai-sdk/openai',
      apiKey: 'instance-key',
      models: OPENAI_MODELS,
    },
  };

  const workspaceProviders = (apiKey: string): AiProvidersConfig => ({
    openai: {
      npm: '@ai-sdk/openai',
      apiKey,
      models: OPENAI_MODELS,
    },
  });

  it('builds the model from the workspace BYOK key at generation time', async () => {
    const { registry, providerConfigService, sdkProviderFactory } =
      buildRegistry();

    providerConfigService.getResolvedProviders.mockReturnValue(
      instanceProviders,
    );
    providerConfigService.getWorkspaceProviderResolution.mockResolvedValue({
      providers: workspaceProviders('workspace-key'),
      hasWorkspaceOverrides: true,
    });

    const model = await registry.runWithWorkspaceRegistry(WORKSPACE_A, () =>
      registry.getModel('openai/gpt-4o'),
    );

    expect(model?.model).toMatchObject({
      __label: 'workspace',
      __apiKey: 'workspace-key',
    });
    expect(sdkProviderFactory.createTransientProvider).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'workspace-key' }),
    );
  });

  it('uses the instance provider when the workspace has no BYOK key', async () => {
    const { registry, providerConfigService, sdkProviderFactory } =
      buildRegistry();

    providerConfigService.getResolvedProviders.mockReturnValue(
      instanceProviders,
    );
    providerConfigService.getWorkspaceProviderResolution.mockResolvedValue({
      providers: instanceProviders,
      hasWorkspaceOverrides: false,
    });

    const model = await registry.runWithWorkspaceRegistry(WORKSPACE_A, () =>
      registry.getModel('openai/gpt-4o'),
    );

    expect(model?.model).toMatchObject({
      __label: 'instance',
      __apiKey: 'instance-key',
    });
    expect(sdkProviderFactory.createTransientProvider).not.toHaveBeenCalled();
  });

  it('never serves one workspace resolved providers to another', async () => {
    const { registry, providerConfigService, sdkProviderFactory } =
      buildRegistry();

    providerConfigService.getResolvedProviders.mockReturnValue(
      instanceProviders,
    );
    providerConfigService.getWorkspaceProviderResolution.mockImplementation(
      ({ workspaceId }: { workspaceId: string }) =>
        Promise.resolve({
          providers: workspaceProviders(`${workspaceId}-key`),
          hasWorkspaceOverrides: true,
        }),
    );

    const modelA = await registry.runWithWorkspaceRegistry(WORKSPACE_A, () =>
      registry.getModel('openai/gpt-4o'),
    );
    const modelB = await registry.runWithWorkspaceRegistry(WORKSPACE_B, () =>
      registry.getModel('openai/gpt-4o'),
    );

    expect(modelA?.model).toMatchObject({ __apiKey: `${WORKSPACE_A}-key` });
    expect(modelB?.model).toMatchObject({ __apiKey: `${WORKSPACE_B}-key` });

    // The workspace snapshot is request-scoped: the instance-cached registry
    // still holds the instance provider, not the last workspace's key.
    const globalModel = registry.getModel('openai/gpt-4o');

    expect(globalModel?.model).toMatchObject({ __apiKey: 'instance-key' });
    expect(sdkProviderFactory.createProvider).toHaveBeenCalledWith(
      'openai',
      expect.objectContaining({ apiKey: 'instance-key' }),
    );
  });

  it('passes the instance custom-provider entitlement into the workspace resolution', async () => {
    const { registry, providerConfigService } = buildRegistry();

    providerConfigService.getResolvedProviders.mockReturnValue(
      instanceProviders,
    );
    providerConfigService.getWorkspaceProviderResolution.mockResolvedValue({
      providers: instanceProviders,
      hasWorkspaceOverrides: false,
    });

    await registry.runWithWorkspaceRegistry(WORKSPACE_A, () => undefined);

    expect(
      providerConfigService.getWorkspaceProviderResolution,
    ).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_A,
      includeCustomProviders: true,
    });
  });
});
