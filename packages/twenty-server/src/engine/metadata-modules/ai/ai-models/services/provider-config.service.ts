import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';

import { type ConfigVariables } from 'src/engine/core-modules/twenty-config/config-variables';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { DefaultAiCatalogService } from 'src/engine/metadata-modules/ai/ai-models/services/default-ai-catalog.service';
import { WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';

import { type AiProviderConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.type';
import { type AiProviderModelConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-model-config.type';
import { type AiProvidersConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-providers-config.type';
import { extractConfigVariableName } from 'src/engine/metadata-modules/ai/ai-models/utils/extract-config-variable-name.util';
import { isProviderConfigured } from 'src/engine/metadata-modules/ai/ai-models/utils/is-provider-configured.util';

@Injectable()
export class ProviderConfigService {
  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly defaultAiCatalogService: DefaultAiCatalogService,
    private readonly workspaceAiProviderService: WorkspaceAiProviderService,
  ) {}

  getCatalogProviderNames(): Set<string> {
    return new Set(
      Object.keys(this.defaultAiCatalogService.getDefaultAiCatalog()),
    );
  }

  getResolvedProviders({
    includeCustomProviders = true,
  }: { includeCustomProviders?: boolean } = {}): AiProvidersConfig {
    const rawCatalog = this.defaultAiCatalogService.getDefaultAiCatalog();
    // Only resolve {{VAR}} templates in the committed catalog — never in
    // user-supplied custom providers, to prevent config variable exfiltration.
    const catalog = this.resolveTemplates(rawCatalog);

    // Dropping the custom entries rather than filtering the merged map also
    // restores a catalog provider that a custom entry of the same name shadows.
    if (!includeCustomProviders) {
      return catalog;
    }

    const custom = this.twentyConfigService.get('AI_PROVIDERS');

    return { ...catalog, ...custom };
  }

  // Resolution order: workspace BYOK provider → instance AI_PROVIDERS →
  // committed catalog. Workspace entries are merged last and never run through
  // resolveTemplates, matching the rule that custom provider values are not
  // template-resolved. They are also merged even when includeCustomProviders is
  // false: a workspace's own key carries its own provider cost, so the
  // instance-level custom-provider entitlement does not gate it (D-N4).
  async getResolvedProvidersForWorkspace({
    workspaceId,
    includeCustomProviders = true,
  }: {
    workspaceId: string;
    includeCustomProviders?: boolean;
  }): Promise<AiProvidersConfig> {
    const { providers } = await this.getWorkspaceProviderResolution({
      workspaceId,
      includeCustomProviders,
    });

    return providers;
  }

  // The front's zero-AI gate reads this instead of the instance-wide model
  // list: resolution includes workspace BYOK rows, so a workspace that saved
  // its own key is AI-capable even when the instance has no provider and the
  // global `ClientConfig.aiModels` is empty. The check mirrors the registry's
  // own "usable provider" test (`isProviderConfigured`) so the gate can never
  // advertise a provider the registry would refuse to build.
  async hasConfiguredAiProvider(workspaceId: string): Promise<boolean> {
    const providers = await this.getResolvedProvidersForWorkspace({
      workspaceId,
    });

    return Object.values(providers).some((config) =>
      isProviderConfigured(config),
    );
  }

  // Registry callers need to know whether a workspace overrides anything at
  // all: when it does not, the instance-cached registry can serve the request
  // unchanged, so the workspace snapshot (and its transient SDK instances) is
  // only built for the workspaces that actually saved a BYOK key.
  async getWorkspaceProviderResolution({
    workspaceId,
    includeCustomProviders = true,
  }: {
    workspaceId: string;
    includeCustomProviders?: boolean;
  }): Promise<{
    providers: AiProvidersConfig;
    hasWorkspaceOverrides: boolean;
  }> {
    const resolvedProviders = this.getResolvedProviders({
      includeCustomProviders,
    });
    const workspaceProviders =
      await this.workspaceAiProviderService.resolveProviders(workspaceId);

    if (workspaceProviders.length === 0) {
      return { providers: resolvedProviders, hasWorkspaceOverrides: false };
    }

    return {
      providers: workspaceProviders.reduce<AiProvidersConfig>(
        (providers, workspaceProvider) => {
          const baseProvider = providers[workspaceProvider.providerName];

          return {
            ...providers,
            [workspaceProvider.providerName]: {
              ...baseProvider,
              ...workspaceProvider.providerConfig,
              ...this.buildWorkspaceModelsForProvider({
                baseProvider,
                workspaceProviderModels: [
                  workspaceProvider.defaultModel,
                  workspaceProvider.fastModel,
                ],
              }),
            },
          };
        },
        resolvedProviders,
      ),
      hasWorkspaceOverrides: true,
    };
  }

  // A provider that only exists in the workspace entry (an OpenAI-compatible
  // base URL, typically) has no catalog models to inherit, so the models the
  // admin selected are registered as the provider's model list. Catalog
  // providers keep their full committed list instead.
  private buildWorkspaceModelsForProvider({
    baseProvider,
    workspaceProviderModels,
  }: {
    baseProvider?: AiProviderConfig;
    workspaceProviderModels: Array<string | null>;
  }): { models?: AiProviderModelConfig[] } {
    if (baseProvider?.models?.length) {
      return {};
    }

    const modelNames = [
      ...new Set(workspaceProviderModels.filter(isNonEmptyString)),
    ];

    if (modelNames.length === 0) {
      return {};
    }

    return {
      models: modelNames.map((name) => ({ name, label: name })),
    };
  }

  private resolveTemplates(providers: AiProvidersConfig): AiProvidersConfig {
    const result: AiProvidersConfig = {};

    for (const [name, config] of Object.entries(providers)) {
      result[name] = this.resolveProviderTemplates(config);
    }

    return result;
  }

  private resolveProviderTemplates(config: AiProviderConfig): AiProviderConfig {
    return {
      ...config,
      baseUrl: this.resolveTemplate(config.baseUrl),
      apiKey: this.resolveTemplate(config.apiKey),
      accessKeyId: this.resolveTemplate(config.accessKeyId),
      secretAccessKey: this.resolveTemplate(config.secretAccessKey),
    };
  }

  private resolveTemplate(value?: string): string | undefined {
    if (!value) {
      return value;
    }

    const varName = extractConfigVariableName(value);

    if (!varName) {
      return value;
    }

    // Registered config variables first (supports admin panel / DB overrides),
    // then fall back to process.env for vars not in ConfigVariables
    // (e.g. when CI replaces the catalog with custom provider entries).
    try {
      const resolved = this.twentyConfigService.get(
        varName as keyof ConfigVariables,
      ) as string | undefined;

      if (resolved) {
        return resolved;
      }
    } catch {
      // Not a registered config variable — fall through to env
    }

    return process.env[varName] || undefined;
  }
}
