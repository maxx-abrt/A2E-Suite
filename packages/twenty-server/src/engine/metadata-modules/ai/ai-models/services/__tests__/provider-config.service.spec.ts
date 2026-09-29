import { ProviderConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/provider-config.service';
import { type WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';
import { type DefaultAiCatalogService } from 'src/engine/metadata-modules/ai/ai-models/services/default-ai-catalog.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

const buildProviderConfigService = ({
  catalog,
  instanceProviders,
  workspaceProviders,
}: {
  catalog: Record<string, unknown>;
  instanceProviders?: Record<string, unknown>;
  workspaceProviders?: Array<{
    providerName: string;
    providerConfig: { npm: string; apiKey?: string; baseUrl?: string };
    defaultModel: string | null;
    fastModel: string | null;
  }>;
}) => {
  const twentyConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'AI_PROVIDERS') {
        return instanceProviders;
      }

      if (key === 'OPENAI_API_KEY') {
        return 'instance-openai-key';
      }

      return undefined;
    }),
  } as unknown as TwentyConfigService;

  const defaultAiCatalogService = {
    getDefaultAiCatalog: jest.fn(() => catalog),
  } as unknown as DefaultAiCatalogService;

  const workspaceAiProviderService = {
    resolveProviders: jest.fn().mockResolvedValue(workspaceProviders ?? []),
  } as unknown as WorkspaceAiProviderService;

  return new ProviderConfigService(
    twentyConfigService,
    defaultAiCatalogService,
    workspaceAiProviderService,
  );
};

describe('ProviderConfigService', () => {
  it('falls back to the instance AI_PROVIDERS entry over the catalog', async () => {
    const service = buildProviderConfigService({
      catalog: {
        openai: { npm: '@ai-sdk/openai', apiKey: 'catalog-key', models: [] },
      },
      instanceProviders: {
        openai: { npm: '@ai-sdk/openai', apiKey: 'instance-key' },
      },
    });

    const providers = await service.getResolvedProvidersForWorkspace({
      workspaceId: WORKSPACE_ID,
    });

    expect(providers.openai.apiKey).toBe('instance-key');
  });

  it('resolves the workspace provider over the instance and catalog entries', async () => {
    const service = buildProviderConfigService({
      catalog: {
        openai: {
          npm: '@ai-sdk/openai',
          apiKey: 'catalog-key',
          models: [{ name: 'gpt-4o', label: 'GPT-4o' }],
        },
      },
      workspaceProviders: [
        {
          providerName: 'openai',
          providerConfig: { npm: '@ai-sdk/openai', apiKey: 'workspace-key' },
          defaultModel: 'gpt-4o',
          fastModel: 'gpt-4o-mini',
        },
      ],
    });

    const providers = await service.getResolvedProvidersForWorkspace({
      workspaceId: WORKSPACE_ID,
    });

    expect(providers.openai.apiKey).toBe('workspace-key');
    // The catalog model list survives the credential override.
    expect(providers.openai.models).toEqual([
      { name: 'gpt-4o', label: 'GPT-4o' },
    ]);
  });

  it('includes the workspace provider even when custom providers are disabled', async () => {
    const service = buildProviderConfigService({
      catalog: {
        openai: { npm: '@ai-sdk/openai', apiKey: 'catalog-key', models: [] },
      },
      instanceProviders: {
        openai: { npm: '@ai-sdk/openai', apiKey: 'instance-key' },
      },
      workspaceProviders: [
        {
          providerName: 'openai',
          providerConfig: { npm: '@ai-sdk/openai', apiKey: 'workspace-key' },
          defaultModel: null,
          fastModel: null,
        },
      ],
    });

    const providers = await service.getResolvedProvidersForWorkspace({
      workspaceId: WORKSPACE_ID,
      includeCustomProviders: false,
    });

    expect(providers.openai.apiKey).toBe('workspace-key');
  });

  it('registers the selected default and fast models for a provider with no catalog models', async () => {
    const service = buildProviderConfigService({
      catalog: {
        openai: { npm: '@ai-sdk/openai', apiKey: 'catalog-key', models: [] },
      },
      workspaceProviders: [
        {
          providerName: 'openai-compatible',
          providerConfig: {
            npm: '@ai-sdk/openai-compatible',
            apiKey: 'workspace-key',
            baseUrl: 'https://llm.example.com/v1',
          },
          defaultModel: 'my-default-model',
          fastModel: 'my-fast-model',
        },
      ],
    });

    const providers = await service.getResolvedProvidersForWorkspace({
      workspaceId: WORKSPACE_ID,
    });

    expect(providers['openai-compatible']).toEqual({
      npm: '@ai-sdk/openai-compatible',
      apiKey: 'workspace-key',
      baseUrl: 'https://llm.example.com/v1',
      models: [
        { name: 'my-default-model', label: 'my-default-model' },
        { name: 'my-fast-model', label: 'my-fast-model' },
      ],
    });
  });

  it('never template-resolves workspace provider values', async () => {
    const service = buildProviderConfigService({
      catalog: {
        openai: { npm: '@ai-sdk/openai', apiKey: 'catalog-key', models: [] },
      },
      workspaceProviders: [
        {
          providerName: 'openai-compatible',
          providerConfig: {
            npm: '@ai-sdk/openai-compatible',
            apiKey: '{{OPENAI_API_KEY}}',
            baseUrl: '{{OPENAI_BASE_URL}}',
          },
          defaultModel: null,
          fastModel: null,
        },
      ],
    });

    const providers = await service.getResolvedProvidersForWorkspace({
      workspaceId: WORKSPACE_ID,
    });

    expect(providers['openai-compatible'].apiKey).toBe('{{OPENAI_API_KEY}}');
    expect(providers['openai-compatible'].baseUrl).toBe('{{OPENAI_BASE_URL}}');
  });

  it('resolves templates in the catalog but keeps custom instance providers literal', async () => {
    const service = buildProviderConfigService({
      catalog: {
        openai: {
          npm: '@ai-sdk/openai',
          apiKey: '{{OPENAI_API_KEY}}',
          models: [],
        },
      },
      instanceProviders: {
        custom: {
          npm: '@ai-sdk/openai-compatible',
          apiKey: '{{OPENAI_API_KEY}}',
        },
      },
    });

    const providers = await service.getResolvedProvidersForWorkspace({
      workspaceId: WORKSPACE_ID,
    });

    expect(providers.openai.apiKey).toBe('instance-openai-key');
    expect(providers.custom.apiKey).toBe('{{OPENAI_API_KEY}}');
  });
});
