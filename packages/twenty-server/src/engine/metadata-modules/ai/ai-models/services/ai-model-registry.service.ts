import { Injectable, Logger } from '@nestjs/common';

import { AsyncLocalStorage } from 'async_hooks';

import { type LanguageModel, type TranscriptionModel } from 'ai';
import { isNonEmptyString } from '@sniptt/guards';
import { type AiSdkPackage } from 'twenty-shared/ai';

import { MAX_SEATS_WITHOUT_ENTERPRISE_KEY } from 'src/engine/core-modules/enterprise/constants/max-seats-without-enterprise-key.constant';
import { CustomAiProviderAccessService } from 'src/engine/core-modules/enterprise/services/custom-ai-provider-access.service';
import { ConfigVariablesGroup } from 'src/engine/core-modules/twenty-config/enums/config-variables-group.enum';
import { ConfigGroupHashService } from 'src/engine/core-modules/twenty-config/services/config-group-hash.service';
import { AiModelRole } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-role.enum';

import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';
import { AiModelPreferencesService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-preferences.service';
import { ProviderConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/provider-config.service';
import {
  SdkProviderFactoryService,
  type AiSdkProviderInstance,
} from 'src/engine/metadata-modules/ai/ai-models/services/sdk-provider-factory.service';
import { type AiModelConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-config.type';
import { type AiTranscriptionModelConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-transcription-model-config.type';
import { type AiProviderConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.type';
import { type AiProviderModelConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-model-config.type';
import { type AiProvidersConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-providers-config.type';
import { DEFAULT_CONTEXT_WINDOW_TOKENS } from 'src/engine/metadata-modules/ai/ai-models/types/default-context-window-tokens.const';
import {
  AUTO_SELECT_FAST_MODEL_ID,
  AUTO_SELECT_SMART_MODEL_ID,
} from 'twenty-shared/constants';
import { isAutoSelectModelId, isDefined } from 'twenty-shared/utils';

import { DEFAULT_MAX_OUTPUT_TOKENS } from 'src/engine/metadata-modules/ai/ai-models/types/default-max-output-tokens.const';
import { buildCompositeModelId } from 'src/engine/metadata-modules/ai/ai-models/utils/composite-model-id.util';
import { getPositiveTokenLimitOrDefault } from 'src/engine/metadata-modules/ai/ai-models/utils/get-positive-token-limit-or-default.util';
import { inferModelFamily } from 'src/engine/metadata-modules/ai/ai-models/utils/infer-model-family.util';
import { isProviderConfigured } from 'src/engine/metadata-modules/ai/ai-models/utils/is-provider-configured.util';
import {
  isModelAllowedByWorkspace,
  type WorkspaceModelAvailabilitySettings,
} from 'src/engine/metadata-modules/ai/ai-models/utils/is-model-allowed.util';
import { workspaceHasEnabledModels } from 'src/engine/metadata-modules/ai/ai-models/utils/workspace-has-enabled-models.util';

export interface RegisteredAiModel {
  modelId: string;
  sdkPackage: AiSdkPackage;
  model: LanguageModel;
  supportsReasoning?: boolean;
  providerName?: string;
  modelsDevName?: string;
  // The instance the model was built from. Carried so native tool binding uses
  // the same (possibly workspace BYOK) credentials rather than a global lookup.
  rawProvider?: unknown;
}

export type RegisteredAiTranscriptionModel = {
  modelId: string;
  sdkPackage: AiSdkPackage;
  model: TranscriptionModel;
  providerName: string;
};

// A workspace-scoped cut of every registry map. Built fresh per request and
// installed in an AsyncLocalStorage so a workspace's resolved providers are
// never written into the instance-wide maps (no cross-workspace leakage).
type AiModelRegistryView = {
  modelRegistry: Map<string, RegisteredAiModel>;
  modelConfigCache: Map<string, AiModelConfig>;
  transcriptionRegistry: Map<string, RegisteredAiTranscriptionModel>;
  transcriptionConfigCache: Map<string, AiTranscriptionModelConfig>;
  providerModelDefCache: Map<
    string,
    { providerName: string; modelDef: AiProviderModelConfig }
  >;
};

@Injectable()
export class AiModelRegistryService {
  private readonly logger = new Logger(AiModelRegistryService.name);
  private modelRegistry: Map<string, RegisteredAiModel> = new Map();
  private modelConfigCache: Map<string, AiModelConfig> = new Map();
  // Kept out of modelRegistry and modelConfigCache so transcription models can
  // never surface in the chat model picker or reach token costing.
  private transcriptionRegistry: Map<string, RegisteredAiTranscriptionModel> =
    new Map();
  private transcriptionConfigCache: Map<string, AiTranscriptionModelConfig> =
    new Map();
  private providerModelDefCache: Map<
    string,
    { providerName: string; modelDef: AiProviderModelConfig }
  > = new Map();
  private currentConfigHash: string | null = null;
  private areCustomProvidersRegistered = true;
  private readonly workspaceRegistryStorage =
    new AsyncLocalStorage<AiModelRegistryView>();

  constructor(
    private readonly providerConfigService: ProviderConfigService,
    private readonly sdkProviderFactory: SdkProviderFactoryService,
    private readonly preferencesService: AiModelPreferencesService,
    private readonly configGroupHashService: ConfigGroupHashService,
    private readonly customAiProviderAccessService: CustomAiProviderAccessService,
  ) {}

  // The registry is rebuilt lazily whenever the LLM-group config hash changes,
  // so any mutation to an LLM-tagged config variable is picked up automatically
  // on the next read — no explicit refresh from callers needed. Seats are not
  // part of that hash, so the custom-provider entitlement is compared alongside
  // it: an instance that grows past the threshold loses its custom models on the
  // next read rather than waiting for an unrelated config change.
  private ensureFresh(): void {
    const configHash = this.configGroupHashService.computeHash(
      ConfigVariablesGroup.LLM,
    );
    const areCustomProvidersAllowed =
      this.customAiProviderAccessService.getCachedHasAccess();

    if (
      configHash === this.currentConfigHash &&
      areCustomProvidersAllowed === this.areCustomProvidersRegistered
    ) {
      return;
    }

    this.buildModelRegistry(areCustomProvidersAllowed);
    this.currentConfigHash = configHash;
    this.areCustomProvidersRegistered = areCustomProvidersAllowed;
  }

  private buildModelRegistry(areCustomProvidersAllowed: boolean): void {
    this.modelRegistry.clear();
    this.sdkProviderFactory.clearCache();
    this.modelConfigCache.clear();
    this.transcriptionRegistry.clear();
    this.transcriptionConfigCache.clear();
    this.providerModelDefCache.clear();

    const providers = this.providerConfigService.getResolvedProviders({
      includeCustomProviders: areCustomProvidersAllowed,
    });

    this.registerModelsFromProviders(
      providers,
      this.getGlobalView(),
      (providerKey, config) =>
        this.sdkProviderFactory.createProvider(providerKey, config),
    );
  }

  private getGlobalView(): AiModelRegistryView {
    return {
      modelRegistry: this.modelRegistry,
      modelConfigCache: this.modelConfigCache,
      transcriptionRegistry: this.transcriptionRegistry,
      transcriptionConfigCache: this.transcriptionConfigCache,
      providerModelDefCache: this.providerModelDefCache,
    };
  }

  private getActiveView(): AiModelRegistryView {
    return this.workspaceRegistryStorage.getStore() ?? this.getGlobalView();
  }

  private createEmptyView(): AiModelRegistryView {
    return {
      modelRegistry: new Map(),
      modelConfigCache: new Map(),
      transcriptionRegistry: new Map(),
      transcriptionConfigCache: new Map(),
      providerModelDefCache: new Map(),
    };
  }

  // Built per request from the workspace-resolved providers. Provider SDK
  // instances are created transiently (never via the global provider-name
  // cache) so one workspace's key can never be handed to another workspace.
  private buildWorkspaceModelRegistry(
    providers: AiProvidersConfig,
  ): AiModelRegistryView {
    const view = this.createEmptyView();

    this.registerModelsFromProviders(providers, view, (_providerKey, config) =>
      this.sdkProviderFactory.createTransientProvider(config),
    );

    return view;
  }

  // Runs `fn` with the acting workspace's resolved providers installed for the
  // duration of the read. A workspace with no BYOK key takes the instance-wide
  // path untouched (same cached instances and native raw providers as before);
  // only a workspace that saved a key gets a workspace snapshot.
  //
  // Billing (D-N4): a BYOK workspace's own key is deliberately merged even when
  // the instance-level custom-provider entitlement (`includeCustomProviders`)
  // is off — the key is billed to that workspace's own provider account, so it
  // is an explicit entitlement bypass, not a billing bypass. Tokens still flow
  // through AiBillingService against the model config; there is no per-workspace
  // BYOK metering yet (M10d follow-up), which is why the merge is unconditional.
  async runWithWorkspaceRegistry<TResult>(
    workspaceId: string,
    fn: () => TResult,
  ): Promise<TResult> {
    const { providers, hasWorkspaceOverrides } =
      await this.providerConfigService.getWorkspaceProviderResolution({
        workspaceId,
        includeCustomProviders:
          this.customAiProviderAccessService.getCachedHasAccess(),
      });

    if (!hasWorkspaceOverrides) {
      return fn();
    }

    const view = this.buildWorkspaceModelRegistry(providers);

    return this.workspaceRegistryStorage.run(view, fn);
  }

  private registerModelsFromProviders(
    providers: AiProvidersConfig,
    view: AiModelRegistryView,
    createProviderInstance: (
      providerKey: string,
      config: AiProviderConfig,
    ) => AiSdkProviderInstance,
  ): void {
    for (const [providerKey, config] of Object.entries(providers)) {
      if (!config.npm) {
        this.logger.warn(
          `Skipping provider "${providerKey}": missing npm field`,
        );
        continue;
      }

      const models = config.models ?? [];

      if (models.length === 0) {
        continue;
      }

      const sdkInstance = isProviderConfigured(config)
        ? createProviderInstance(providerKey, config)
        : undefined;

      for (const modelDef of models) {
        const compositeId = buildCompositeModelId(providerKey, modelDef.name);

        if (modelDef.kind === 'transcription') {
          this.registerTranscriptionModel({
            view,
            compositeId,
            providerKey,
            config,
            modelDef,
            sdkInstance,
          });

          continue;
        }

        view.modelConfigCache.set(
          compositeId,
          this.toAiModelConfig(compositeId, config, modelDef),
        );

        view.providerModelDefCache.set(compositeId, {
          providerName: providerKey,
          modelDef,
        });

        if (sdkInstance) {
          view.modelRegistry.set(compositeId, {
            modelId: compositeId,
            sdkPackage: config.npm,
            model: sdkInstance.createModel(modelDef.name),
            supportsReasoning: modelDef.supportsReasoning,
            providerName: providerKey,
            modelsDevName: config.name,
            rawProvider: sdkInstance.rawProvider,
          });
        }
      }
    }
  }

  private registerTranscriptionModel({
    view,
    compositeId,
    providerKey,
    config,
    modelDef,
    sdkInstance,
  }: {
    view: AiModelRegistryView;
    compositeId: string;
    providerKey: string;
    config: AiProviderConfig;
    modelDef: AiProviderModelConfig;
    sdkInstance: AiSdkProviderInstance | undefined;
  }): void {
    // An omitted price bills nothing while the provider still charges, so the
    // model is refused rather than run for free. An explicit 0 is allowed.
    if (!isDefined(modelDef.costPerMinute)) {
      this.logger.error(
        `Skipping transcription model "${compositeId}": costPerMinute is required`,
      );

      return;
    }

    view.transcriptionConfigCache.set(compositeId, {
      modelId: compositeId,
      sdkPackage: config.npm,
      label: modelDef.label,
      description: modelDef.description ?? compositeId,
      dataResidency: config.dataResidency,
      costPerMinute: modelDef.costPerMinute,
      isDeprecated: modelDef.isDeprecated,
    });

    if (!sdkInstance) {
      return;
    }

    const createTranscriptionModel = sdkInstance.createTranscriptionModel;

    if (!isDefined(createTranscriptionModel)) {
      this.logger.warn(
        `Skipping transcription model "${compositeId}": ${config.npm} exposes no transcription API`,
      );

      return;
    }

    view.transcriptionRegistry.set(compositeId, {
      modelId: compositeId,
      sdkPackage: config.npm,
      model: createTranscriptionModel(modelDef.name),
      providerName: providerKey,
    });
  }

  getTranscriptionModel(
    modelId: string,
  ): RegisteredAiTranscriptionModel | undefined {
    this.ensureFresh();

    return this.getActiveView().transcriptionRegistry.get(modelId);
  }

  getAvailableTranscriptionModels(): RegisteredAiTranscriptionModel[] {
    this.ensureFresh();

    return Array.from(this.getActiveView().transcriptionRegistry.values());
  }

  // Registration order follows the provider config, so the first entry is the
  // one an operator listed first.
  getDefaultTranscriptionModel(): RegisteredAiTranscriptionModel | undefined {
    return this.getAvailableTranscriptionModels().find(
      (model) =>
        this.getTranscriptionModelConfig(model.modelId)?.isDeprecated !== true,
    );
  }

  getTranscriptionModelConfig(
    modelId: string,
  ): AiTranscriptionModelConfig | undefined {
    this.ensureFresh();

    return this.getActiveView().transcriptionConfigCache.get(modelId);
  }

  // Deliberately the same rule as getDefaultTranscriptionModel: a registry
  // holding only deprecated models would otherwise advertise cloud dictation
  // that every request without an explicit model id then fails to resolve.
  hasTranscriptionModel(): boolean {
    return isDefined(this.getDefaultTranscriptionModel());
  }

  private toAiModelConfig(
    compositeId: string,
    providerConfig: AiProviderConfig,
    modelDef: AiProviderModelConfig,
  ): AiModelConfig {
    return {
      modelId: compositeId,
      label: modelDef.label,
      sdkPackage: providerConfig.npm,
      description: modelDef.description ?? compositeId,
      modelFamily:
        modelDef.modelFamily ??
        inferModelFamily(providerConfig.name ?? '', modelDef.name),
      dataResidency: providerConfig.dataResidency,
      inputCostPerMillionTokens: modelDef.inputCostPerMillionTokens ?? 0,
      outputCostPerMillionTokens: modelDef.outputCostPerMillionTokens ?? 0,
      cachedInputCostPerMillionTokens: modelDef.cachedInputCostPerMillionTokens,
      cacheCreationCostPerMillionTokens:
        modelDef.cacheCreationCostPerMillionTokens,
      longContextCost: modelDef.longContextCost,
      contextWindowTokens: getPositiveTokenLimitOrDefault(
        modelDef.contextWindowTokens,
        DEFAULT_CONTEXT_WINDOW_TOKENS,
      ),
      maxOutputTokens: getPositiveTokenLimitOrDefault(
        modelDef.maxOutputTokens,
        DEFAULT_MAX_OUTPUT_TOKENS,
      ),
      modalities: modelDef.modalities,
      supportsReasoning: modelDef.supportsReasoning,
      isDeprecated: modelDef.isDeprecated,
    };
  }

  getModel(modelId: string): RegisteredAiModel | undefined {
    this.ensureFresh();

    return this.getActiveView().modelRegistry.get(modelId);
  }

  getAvailableModels(): RegisteredAiModel[] {
    this.ensureFresh();

    return Array.from(this.getActiveView().modelRegistry.values());
  }

  getModelConfig(modelId: string): AiModelConfig | undefined {
    this.ensureFresh();

    return this.getActiveView().modelConfigCache.get(modelId);
  }

  getRecommendedModelIds(): Set<string> {
    return this.preferencesService.getRecommendedModelIds();
  }

  private getFirstAvailableModelFromList(
    modelIds: string[],
  ): RegisteredAiModel | undefined {
    for (const modelId of modelIds) {
      const model = this.getModel(modelId);

      if (model) {
        return model;
      }
    }

    return undefined;
  }

  getDefaultSpeedModel(): RegisteredAiModel {
    return this.getDefaultModelForRole(AiModelRole.FAST);
  }

  getDefaultPerformanceModel(): RegisteredAiModel {
    return this.getDefaultModelForRole(AiModelRole.SMART);
  }

  private getDefaultModelForRole(role: AiModelRole): RegisteredAiModel {
    const prefs = this.preferencesService.getPreferences();
    const preferenceKey =
      role === AiModelRole.FAST ? 'defaultFastModels' : 'defaultSmartModels';

    let model = this.getFirstAvailableModelFromList(prefs[preferenceKey] ?? []);

    if (!model) {
      model = this.getAvailableModels()[0];
    }

    if (!model) {
      throw new AiException(
        'No AI models are available. Configure at least one AI provider.',
        AiExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }

    return model;
  }

  getEffectiveModelConfig(modelId: string): AiModelConfig {
    this.ensureFresh();

    if (isAutoSelectModelId(modelId)) {
      const defaultModel =
        modelId === AUTO_SELECT_FAST_MODEL_ID
          ? this.getDefaultSpeedModel()
          : this.getDefaultPerformanceModel();

      return (
        this.getActiveView().modelConfigCache.get(defaultModel.modelId) ??
        this.createDefaultConfigForCustomModel(defaultModel)
      );
    }

    const config = this.getActiveView().modelConfigCache.get(modelId);

    if (config) {
      return config;
    }

    const registeredModel = this.getModel(modelId);

    if (registeredModel) {
      return this.createDefaultConfigForCustomModel(registeredModel);
    }

    throw new AiException(
      this.buildModelNotFoundMessage(modelId),
      AiExceptionCode.AGENT_EXECUTION_FAILED,
    );
  }

  // A model that disappeared because the instance outgrew the complimentary
  // threshold looks exactly like a typo from the caller's side, so the reason is
  // spelled out rather than leaving an operator to guess at a missing model.
  private buildModelNotFoundMessage(modelId: string): string {
    const message = `Model with ID ${modelId} not found`;

    if (this.areCustomProvidersRegistered) {
      return message;
    }

    const [providerName] = modelId.split('/');
    const isCustomProviderModel =
      isNonEmptyString(providerName) &&
      !this.providerConfigService.getCatalogProviderNames().has(providerName);

    if (!isCustomProviderModel) {
      return message;
    }

    return `${message}. Custom AI providers require a valid enterprise key above ${MAX_SEATS_WITHOUT_ENTERPRISE_KEY} seats.`;
  }

  private createDefaultConfigForCustomModel(
    registeredModel: RegisteredAiModel,
  ): AiModelConfig {
    return {
      modelId: registeredModel.modelId,
      label: registeredModel.modelId,
      description: `Custom model: ${registeredModel.modelId}`,
      modelFamily: inferModelFamily(
        registeredModel.modelsDevName ?? '',
        registeredModel.modelId,
      ),
      sdkPackage: registeredModel.sdkPackage,
      inputCostPerMillionTokens: 0,
      outputCostPerMillionTokens: 0,
      contextWindowTokens: DEFAULT_CONTEXT_WINDOW_TOKENS,
      maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    };
  }

  isModelAdminAllowed(modelId: string): boolean {
    if (isAutoSelectModelId(modelId)) {
      return true;
    }

    const prefs = this.preferencesService.getPreferences();
    const disabledModels = prefs.disabledModels ?? [];

    return !disabledModels.includes(modelId);
  }

  validateModelAvailability(
    modelId: string,
    availabilitySettings: WorkspaceModelAvailabilitySettings,
  ): void {
    if (!this.isModelAdminAllowed(modelId)) {
      throw new AiException(
        'The selected model has been disabled by the administrator.',
        AiExceptionCode.AGENT_EXECUTION_FAILED,
      );
    }

    const recommendedModelIds = this.getRecommendedModelIds();

    const isAvailable = isAutoSelectModelId(modelId)
      ? workspaceHasEnabledModels(availabilitySettings, recommendedModelIds)
      : isModelAllowedByWorkspace(
          modelId,
          availabilitySettings,
          recommendedModelIds,
        );

    if (!isAvailable) {
      throw new AiException(
        'The selected model is not available in this workspace.',
        AiExceptionCode.AGENT_EXECUTION_FAILED,
      );
    }
  }

  getAdminFilteredModels(): RegisteredAiModel[] {
    return this.getAvailableModels().filter((model) =>
      this.isModelAdminAllowed(model.modelId),
    );
  }

  getAllModelsWithStatus(): Array<{
    modelConfig: AiModelConfig;
    isAvailable: boolean;
    isAdminEnabled: boolean;
    isRecommended: boolean;
    providerName?: string;
    name?: string;
  }> {
    this.ensureFresh();
    const recommended = this.getRecommendedModelIds();
    const view = this.getActiveView();

    return Array.from(view.modelConfigCache.values()).map((modelConfig) => {
      const registered = view.modelRegistry.get(modelConfig.modelId);
      const cached = view.providerModelDefCache.get(modelConfig.modelId);

      return {
        modelConfig,
        isAvailable: !!registered,
        isAdminEnabled: this.isModelAdminAllowed(modelConfig.modelId),
        isRecommended: recommended.has(modelConfig.modelId),
        providerName: registered?.providerName ?? cached?.providerName,
        name: cached?.modelDef.name,
      };
    });
  }

  async setModelAdminEnabled(modelId: string, enabled: boolean): Promise<void> {
    this.validateModelInRegistry(modelId);
    await this.preferencesService.setModelAdminEnabled(modelId, enabled);
  }

  async setModelRecommended(
    modelId: string,
    recommended: boolean,
  ): Promise<void> {
    this.validateModelInRegistry(modelId);
    await this.preferencesService.setModelRecommended(modelId, recommended);
  }

  async setModelsAdminEnabled(
    modelIds: string[],
    enabled: boolean,
  ): Promise<void> {
    modelIds.forEach((id) => this.validateModelInRegistry(id));
    await this.preferencesService.setModelsAdminEnabled(modelIds, enabled);
  }

  async setModelsRecommended(
    modelIds: string[],
    recommended: boolean,
  ): Promise<void> {
    modelIds.forEach((id) => this.validateModelInRegistry(id));
    await this.preferencesService.setModelsRecommended(modelIds, recommended);
  }

  async setDefaultModel(role: AiModelRole, modelId: string): Promise<void> {
    this.validateModelInRegistry(modelId);
    await this.preferencesService.setDefaultModel(role, modelId);
  }

  private validateModelInRegistry(modelId: string): void {
    this.ensureFresh();

    if (!this.providerModelDefCache.has(modelId)) {
      throw new AiException(
        `Cannot update model "${modelId}": not found in registry`,
        AiExceptionCode.AGENT_EXECUTION_FAILED,
      );
    }
  }

  getResolvedProvidersForAdmin(): AiProvidersConfig {
    return this.providerConfigService.getResolvedProviders();
  }

  getCatalogProviderNames(): Set<string> {
    return this.providerConfigService.getCatalogProviderNames();
  }

  resolveModelForAgent(agent: { modelId: string } | null): RegisteredAiModel {
    const aiModel = this.getEffectiveModelConfig(
      agent?.modelId ?? AUTO_SELECT_SMART_MODEL_ID,
    );

    const registeredModel = this.getModel(aiModel.modelId);

    if (!registeredModel) {
      throw new AiException(
        `Model ${aiModel.modelId} not found in registry. Check that the corresponding AI provider is configured.`,
        AiExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }

    return registeredModel;
  }
}
