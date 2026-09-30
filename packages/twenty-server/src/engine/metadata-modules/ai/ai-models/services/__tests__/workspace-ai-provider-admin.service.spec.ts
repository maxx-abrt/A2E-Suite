import { generateText } from 'ai';

import { WorkspaceAiProviderTestErrorCode } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider-test-error-code.enum';
import { WorkspaceAiProviderSource } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider-source.enum';
import { type WorkspaceAiProviderEntity } from 'src/engine/metadata-modules/ai/ai-models/entities/workspace-ai-provider.entity';
import { WorkspaceAiProviderAdminService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider-admin.service';
import { classifyAiProviderTestError } from 'src/engine/metadata-modules/ai/ai-models/utils/classify-ai-provider-test-error.util';
import { type AiProviderConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.type';

jest.mock('ai', () => ({ generateText: jest.fn() }));

const mockedGenerateText = jest.mocked(generateText);

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

const buildService = ({
  resolvedProviders,
  workspaceRows,
  catalogProviderNames,
  rawCatalog,
}: {
  resolvedProviders: Record<string, AiProviderConfig>;
  workspaceRows?: Partial<WorkspaceAiProviderEntity>[];
  catalogProviderNames?: string[];
  rawCatalog?: Record<string, AiProviderConfig>;
}) => {
  const workspaceAiProviderService = {
    findProviders: jest.fn().mockResolvedValue(workspaceRows ?? []),
    getProvider: jest.fn().mockResolvedValue(null),
    decryptProviderApiKey: jest.fn(),
  };

  const providerConfigService = {
    getResolvedProviders: jest.fn().mockReturnValue(resolvedProviders),
    getCatalogProviderNames: jest
      .fn()
      .mockReturnValue(new Set(catalogProviderNames ?? [])),
  };

  const defaultAiCatalogService = {
    getDefaultAiCatalog: jest.fn().mockReturnValue(rawCatalog ?? {}),
  };

  const sdkProviderFactoryService = {
    createTransientProvider: jest.fn().mockReturnValue({
      createModel: jest.fn().mockReturnValue('language-model'),
    }),
  };

  const adminService = new WorkspaceAiProviderAdminService(
    workspaceAiProviderService as never,
    providerConfigService as never,
    defaultAiCatalogService as never,
    sdkProviderFactoryService as never,
  );

  return {
    adminService,
    workspaceAiProviderService,
    sdkProviderFactoryService,
  };
};

describe('WorkspaceAiProviderAdminService', () => {
  beforeEach(() => {
    mockedGenerateText.mockReset();
  });

  it('masks the workspace key and marks WORKSPACE as the winning source', async () => {
    const { adminService } = buildService({
      resolvedProviders: {
        openai: {
          npm: '@ai-sdk/openai',
          label: 'OpenAI',
          apiKey: 'instance-or-catalog-key',
          models: [{ name: 'gpt-4o', label: 'GPT-4o' }],
        },
      },
      workspaceRows: [
        {
          provider: 'openai',
          npm: '@ai-sdk/openai',
          encryptedApiKey: 'cipher-envelope',
          defaultModel: 'gpt-4o-mini',
          fastModel: 'gpt-4o-mini',
        },
      ],
      catalogProviderNames: ['openai'],
      rawCatalog: {
        openai: { npm: '@ai-sdk/openai', apiKey: '{{OPENAI_API_KEY}}' },
      },
    });

    const overview = await adminService.getProvidersOverview(WORKSPACE_ID);
    const [openai] = overview.providers;

    expect(overview.resolutionOrder).toEqual([
      WorkspaceAiProviderSource.WORKSPACE,
      WorkspaceAiProviderSource.INSTANCE,
      WorkspaceAiProviderSource.CATALOG,
    ]);
    expect(openai.source).toBe(WorkspaceAiProviderSource.WORKSPACE);
    expect(openai.hasApiKey).toBe(true);
    expect(openai.maskedApiKey).toBe('••••••••');
    expect(openai.apiKeyConfigVariable).toBe('OPENAI_API_KEY');
    expect(openai.defaultModel).toBe('gpt-4o-mini');
    expect(openai.fastModel).toBe('gpt-4o-mini');
    expect(openai.models).toEqual(['gpt-4o']);
    expect(JSON.stringify(overview)).not.toContain('cipher-envelope');
    expect(JSON.stringify(overview)).not.toContain('instance-or-catalog-key');
  });

  it('falls back to the instance source when no workspace row exists', async () => {
    const { adminService } = buildService({
      resolvedProviders: {
        'my-llm': {
          npm: '@ai-sdk/openai-compatible',
          apiKey: 'instance-key',
          baseUrl: 'https://llm.example.com/v1',
        },
      },
      catalogProviderNames: ['openai'],
    });

    const overview = await adminService.getProvidersOverview(WORKSPACE_ID);

    expect(overview.providers[0].source).toBe(
      WorkspaceAiProviderSource.INSTANCE,
    );
    expect(overview.providers[0].hasApiKey).toBe(true);
    expect(overview.providers[0].apiKeyConfigVariable).toBeNull();
    expect(overview.providers[0].baseUrl).toBe('https://llm.example.com/v1');
  });

  it('marks an unconfigured catalog provider without a mask', async () => {
    const { adminService } = buildService({
      resolvedProviders: {
        anthropic: { npm: '@ai-sdk/anthropic', label: 'Anthropic' },
      },
      catalogProviderNames: ['anthropic'],
    });

    const overview = await adminService.getProvidersOverview(WORKSPACE_ID);

    expect(overview.providers[0].source).toBe(
      WorkspaceAiProviderSource.CATALOG,
    );
    expect(overview.providers[0].hasApiKey).toBe(false);
    expect(overview.providers[0].maskedApiKey).toBeNull();
  });

  it('tests a stored key and reports a typed success', async () => {
    const { adminService, workspaceAiProviderService } = buildService({
      resolvedProviders: {},
    });

    workspaceAiProviderService.getProvider.mockResolvedValue({
      provider: 'openai',
      encryptedApiKey: 'cipher',
      baseUrl: null,
    });
    workspaceAiProviderService.decryptProviderApiKey.mockReturnValue(
      'sk-stored',
    );
    mockedGenerateText.mockResolvedValue({} as never);

    const result = await adminService.testProvider({
      workspaceId: WORKSPACE_ID,
      input: {
        provider: 'openai',
        npm: '@ai-sdk/openai',
        model: 'gpt-4o-mini',
      },
    });

    expect(result).toEqual({
      success: true,
      errorCode: null,
      message: null,
      model: 'gpt-4o-mini',
    });
    expect(workspaceAiProviderService.decryptProviderApiKey).toHaveBeenCalled();
  });

  it('classifies a rejected key without echoing the provider error', async () => {
    const { adminService, workspaceAiProviderService } = buildService({
      resolvedProviders: {},
    });

    workspaceAiProviderService.getProvider.mockResolvedValue({
      provider: 'openai',
      encryptedApiKey: 'cipher',
      baseUrl: null,
    });
    workspaceAiProviderService.decryptProviderApiKey.mockReturnValue(
      'sk-live-secret',
    );
    mockedGenerateText.mockRejectedValue(
      Object.assign(new Error('Incorrect API key provided: sk-live-secret'), {
        statusCode: 401,
      }),
    );

    const result = await adminService.testProvider({
      workspaceId: WORKSPACE_ID,
      input: {
        provider: 'openai',
        npm: '@ai-sdk/openai',
        model: 'gpt-4o-mini',
      },
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(
      WorkspaceAiProviderTestErrorCode.INVALID_API_KEY,
    );
    expect(result.message).toBeNull();
    expect(JSON.stringify(result)).not.toContain('sk-live-secret');
  });

  it('fails with INVALID_CONFIGURATION when no key is available', async () => {
    const { adminService, sdkProviderFactoryService } = buildService({
      resolvedProviders: {},
    });

    const result = await adminService.testProvider({
      workspaceId: WORKSPACE_ID,
      input: {
        provider: 'openai',
        npm: '@ai-sdk/openai',
        model: 'gpt-4o-mini',
      },
    });

    expect(result.errorCode).toBe(
      WorkspaceAiProviderTestErrorCode.INVALID_CONFIGURATION,
    );
    expect(mockedGenerateText).not.toHaveBeenCalled();
    expect(
      sdkProviderFactoryService.createTransientProvider,
    ).not.toHaveBeenCalled();
  });

  it('requires a base URL for an OpenAI-compatible provider test', async () => {
    const { adminService } = buildService({ resolvedProviders: {} });

    const result = await adminService.testProvider({
      workspaceId: WORKSPACE_ID,
      input: {
        provider: 'my-llm',
        npm: '@ai-sdk/openai-compatible',
        apiKey: 'sk-candidate',
        model: 'my-model',
      },
    });

    expect(result.errorCode).toBe(
      WorkspaceAiProviderTestErrorCode.INVALID_CONFIGURATION,
    );
  });
});

describe('classifyAiProviderTestError', () => {
  it('maps authentication and model errors from the status code', () => {
    expect(classifyAiProviderTestError({ statusCode: 401 })).toBe(
      WorkspaceAiProviderTestErrorCode.INVALID_API_KEY,
    );
    expect(classifyAiProviderTestError({ statusCode: 403 })).toBe(
      WorkspaceAiProviderTestErrorCode.INVALID_API_KEY,
    );
    expect(classifyAiProviderTestError({ statusCode: 404 })).toBe(
      WorkspaceAiProviderTestErrorCode.MODEL_NOT_FOUND,
    );
    expect(classifyAiProviderTestError({ statusCode: 400 })).toBe(
      WorkspaceAiProviderTestErrorCode.INVALID_CONFIGURATION,
    );
  });

  it('maps aborts and network failures to PROVIDER_UNREACHABLE', () => {
    expect(
      classifyAiProviderTestError(
        Object.assign(new Error(), { name: 'AbortError' }),
      ),
    ).toBe(WorkspaceAiProviderTestErrorCode.PROVIDER_UNREACHABLE);
    expect(classifyAiProviderTestError(new TypeError('fetch failed'))).toBe(
      WorkspaceAiProviderTestErrorCode.PROVIDER_UNREACHABLE,
    );
  });

  it('falls back to UNKNOWN_ERROR', () => {
    expect(classifyAiProviderTestError(new Error('boom'))).toBe(
      WorkspaceAiProviderTestErrorCode.UNKNOWN_ERROR,
    );
  });
});
