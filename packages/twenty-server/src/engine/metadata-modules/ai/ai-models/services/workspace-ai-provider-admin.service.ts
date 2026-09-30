import { Injectable, Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { generateText } from 'ai';
import { isDefined } from 'twenty-shared/utils';

import { AI_SDK_OPENAI_COMPATIBLE } from 'src/engine/metadata-modules/ai/ai-models/constants/ai-sdk-package.const';
import { WorkspaceAiProviderTestErrorCode } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider-test-error-code.enum';
import {
  WorkspaceAiProviderDTO,
  WorkspaceAiProvidersDTO,
} from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider.dto';
import { WorkspaceAiProviderSource } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider-source.enum';
import { type WorkspaceAiProviderTestResultDTO } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider-test-result.dto';
import { type TestWorkspaceAiProviderInput } from 'src/engine/metadata-modules/ai/ai-models/dtos/test-workspace-ai-provider.input';
import { type WorkspaceAiProviderEntity } from 'src/engine/metadata-modules/ai/ai-models/entities/workspace-ai-provider.entity';
import { DefaultAiCatalogService } from 'src/engine/metadata-modules/ai/ai-models/services/default-ai-catalog.service';
import { ProviderConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/provider-config.service';
import { SdkProviderFactoryService } from 'src/engine/metadata-modules/ai/ai-models/services/sdk-provider-factory.service';
import { WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';
import { aiProviderConfigSchema } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.schema';
import { type AiProviderConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.type';
import { classifyAiProviderTestError } from 'src/engine/metadata-modules/ai/ai-models/utils/classify-ai-provider-test-error.util';
import { extractConfigVariableName } from 'src/engine/metadata-modules/ai/ai-models/utils/extract-config-variable-name.util';

const PROVIDER_API_KEY_MASK = '••••••••';
const PROVIDER_TEST_TIMEOUT_MS = 15_000;

@Injectable()
export class WorkspaceAiProviderAdminService {
  private readonly logger = new Logger(WorkspaceAiProviderAdminService.name);

  constructor(
    private readonly workspaceAiProviderService: WorkspaceAiProviderService,
    private readonly providerConfigService: ProviderConfigService,
    private readonly defaultAiCatalogService: DefaultAiCatalogService,
    private readonly sdkProviderFactoryService: SdkProviderFactoryService,
  ) {}

  async getProvidersOverview(
    workspaceId: string,
  ): Promise<WorkspaceAiProvidersDTO> {
    const resolvedProviders = this.providerConfigService.getResolvedProviders({
      includeCustomProviders: true,
    });
    const workspaceProviderRows =
      await this.workspaceAiProviderService.findProviders(workspaceId);
    const catalogProviderNames =
      this.providerConfigService.getCatalogProviderNames();
    const rawCatalog = this.defaultAiCatalogService.getDefaultAiCatalog();

    const workspaceRowsByProvider = new Map(
      workspaceProviderRows.map((row) => [row.provider, row]),
    );

    const providerNames = [
      ...new Set([
        ...Object.keys(resolvedProviders),
        ...workspaceRowsByProvider.keys(),
      ]),
    ].sort();

    // The same order ProviderConfigService resolves at model-registration
    // time, surfaced so the admin can read the fallback chain in the page.
    return {
      resolutionOrder: [
        WorkspaceAiProviderSource.WORKSPACE,
        WorkspaceAiProviderSource.INSTANCE,
        WorkspaceAiProviderSource.CATALOG,
      ],
      providers: providerNames.map((providerName) =>
        this.toProviderDTO({
          providerName,
          baseProvider: resolvedProviders[providerName],
          workspaceRow: workspaceRowsByProvider.get(providerName),
          isCatalogProvider: catalogProviderNames.has(providerName),
          rawCatalogProvider: rawCatalog[providerName],
        }),
      ),
    };
  }

  async testProvider({
    workspaceId,
    input,
  }: {
    workspaceId: string;
    input: TestWorkspaceAiProviderInput;
  }): Promise<WorkspaceAiProviderTestResultDTO> {
    const model = input.model.trim();
    const storedProvider = await this.workspaceAiProviderService.getProvider({
      workspaceId,
      provider: input.provider,
    });

    let apiKey: string | undefined;

    if (isNonEmptyString(input.apiKey)) {
      apiKey = input.apiKey;
    } else if (isDefined(storedProvider)) {
      try {
        apiKey =
          this.workspaceAiProviderService.decryptProviderApiKey(storedProvider);
      } catch {
        return this.buildTestFailure(
          WorkspaceAiProviderTestErrorCode.INVALID_API_KEY,
          model,
        );
      }
    }

    if (!isNonEmptyString(model) || !isNonEmptyString(apiKey)) {
      return this.buildTestFailure(
        WorkspaceAiProviderTestErrorCode.INVALID_CONFIGURATION,
        model,
      );
    }

    const providerConfig = aiProviderConfigSchema.safeParse({
      npm: input.npm,
      name: input.provider,
      label: input.provider,
      apiKey,
      baseUrl: input.baseUrl ?? storedProvider?.baseUrl ?? undefined,
    });

    if (
      !providerConfig.success ||
      (providerConfig.data.npm === AI_SDK_OPENAI_COMPATIBLE &&
        !isNonEmptyString(providerConfig.data.baseUrl))
    ) {
      return this.buildTestFailure(
        WorkspaceAiProviderTestErrorCode.INVALID_CONFIGURATION,
        model,
      );
    }

    try {
      const providerInstance =
        this.sdkProviderFactoryService.createTransientProvider(
          providerConfig.data,
        );

      // A one-token generation is the cheapest cross-provider proof that the
      // key authenticates; the error classification is the only thing surfaced.
      await generateText({
        model: providerInstance.createModel(model),
        prompt: 'Reply with OK.',
        maxOutputTokens: 1,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(PROVIDER_TEST_TIMEOUT_MS),
      });

      return { success: true, errorCode: null, message: null, model };
    } catch (error) {
      const errorCode = classifyAiProviderTestError(error);

      this.logger.warn(
        `AI provider "${input.provider}" key test failed with ${errorCode}`,
      );

      return this.buildTestFailure(errorCode, model);
    }
  }

  private toProviderDTO({
    providerName,
    baseProvider,
    workspaceRow,
    isCatalogProvider,
    rawCatalogProvider,
  }: {
    providerName: string;
    baseProvider?: AiProviderConfig;
    workspaceRow?: WorkspaceAiProviderEntity;
    isCatalogProvider: boolean;
    rawCatalogProvider?: AiProviderConfig;
  }): WorkspaceAiProviderDTO {
    const hasApiKey =
      isNonEmptyString(workspaceRow?.encryptedApiKey) ||
      isNonEmptyString(baseProvider?.apiKey);
    const baseModels = baseProvider?.models?.map((model) => model.name) ?? [];
    const workspaceModels = [
      workspaceRow?.defaultModel,
      workspaceRow?.fastModel,
    ].filter(isNonEmptyString);
    const models =
      baseModels.length > 0 ? baseModels : [...new Set(workspaceModels)];

    return {
      provider: providerName,
      label: workspaceRow?.label ?? baseProvider?.label ?? providerName,
      npm: workspaceRow?.npm ?? baseProvider?.npm ?? '',
      baseUrl: workspaceRow?.baseUrl ?? baseProvider?.baseUrl ?? null,
      hasApiKey,
      maskedApiKey: hasApiKey ? PROVIDER_API_KEY_MASK : null,
      apiKeyConfigVariable: isCatalogProvider
        ? (extractConfigVariableName(rawCatalogProvider?.apiKey) ?? null)
        : null,
      source: workspaceRow
        ? WorkspaceAiProviderSource.WORKSPACE
        : isCatalogProvider
          ? WorkspaceAiProviderSource.CATALOG
          : WorkspaceAiProviderSource.INSTANCE,
      isCatalogProvider,
      defaultModel: workspaceRow?.defaultModel ?? null,
      fastModel: workspaceRow?.fastModel ?? null,
      models,
    };
  }

  private buildTestFailure(
    errorCode: WorkspaceAiProviderTestErrorCode,
    model: string,
  ): WorkspaceAiProviderTestResultDTO {
    return { success: false, errorCode, message: null, model };
  }
}
