import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { type EncryptedString } from 'src/engine/core-modules/secret-encryption/branded-strings/encrypted-string.type';
import { type PlaintextString } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';
import { WorkspaceAiProviderEntity } from 'src/engine/metadata-modules/ai/ai-models/entities/workspace-ai-provider.entity';
import { aiProviderConfigSchema } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.schema';
import { type AiProviderConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.type';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { type WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

export type ResolvedWorkspaceAiProvider = {
  providerName: string;
  providerConfig: AiProviderConfig;
  defaultModel: string | null;
  fastModel: string | null;
};

export type UpsertWorkspaceAiProviderInput = {
  workspaceId: string;
  provider: string;
  npm: string;
  label?: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  fastModel?: string;
};

@Injectable()
export class WorkspaceAiProviderService {
  constructor(
    @InjectWorkspaceScopedRepository(WorkspaceAiProviderEntity)
    private readonly workspaceAiProviderRepository: WorkspaceScopedRepository<WorkspaceAiProviderEntity>,
    private readonly secretEncryptionService: SecretEncryptionService,
  ) {}

  async resolveProviders(
    workspaceId: string,
  ): Promise<ResolvedWorkspaceAiProvider[]> {
    const rows = await this.workspaceAiProviderRepository.find(workspaceId, {
      order: { createdAt: 'ASC' },
    });

    return rows.map((row) => this.toResolvedProvider(row));
  }

  async getProvider({
    workspaceId,
    provider,
  }: {
    workspaceId: string;
    provider: string;
  }): Promise<WorkspaceAiProviderEntity | null> {
    return this.workspaceAiProviderRepository.findOneBy(workspaceId, {
      provider,
    });
  }

  // Raw rows for the admin projection: it only needs presence/metadata and must
  // not fail (nor decrypt) because one stored key cannot be decrypted.
  async findProviders(
    workspaceId: string,
  ): Promise<WorkspaceAiProviderEntity[]> {
    return this.workspaceAiProviderRepository.find(workspaceId, {
      order: { createdAt: 'ASC' },
    });
  }

  // Decryption for the admin test path only. Callers must never return the
  // value to a client; the thrown AiException is already key-free.
  decryptProviderApiKey(row: WorkspaceAiProviderEntity): string | undefined {
    return this.decryptApiKeyOrThrow(row);
  }

  // A rejected update must not overwrite the stored key, so an omitted apiKey
  // keeps the existing ciphertext (or fails on insert when there is none).
  async upsertProvider({
    workspaceId,
    provider,
    npm,
    label,
    apiKey,
    baseUrl,
    defaultModel,
    fastModel,
  }: UpsertWorkspaceAiProviderInput): Promise<void> {
    const existingProvider = await this.getProvider({ workspaceId, provider });

    const validatedApiKey =
      isDefined(apiKey) && apiKey.length > 0 ? apiKey : undefined;

    if (!isDefined(validatedApiKey) && !isDefined(existingProvider)) {
      throw new AiException(
        'An API key is required to add a workspace AI provider.',
        AiExceptionCode.INVALID_AGENT_INPUT,
      );
    }

    const providerConfig = aiProviderConfigSchema.safeParse({
      npm,
      label,
      apiKey: validatedApiKey,
      baseUrl,
    });

    if (!providerConfig.success) {
      throw new AiException(
        `Invalid workspace AI provider configuration: ${providerConfig.error.issues
          .map((issue) => `${issue.path.join('.')} ${issue.message}`)
          .join(', ')}`,
        AiExceptionCode.INVALID_AGENT_INPUT,
      );
    }

    await this.workspaceAiProviderRepository.upsertAndReturnOne(
      workspaceId,
      {
        provider,
        npm,
        label: label ?? existingProvider?.label ?? null,
        encryptedApiKey: isDefined(validatedApiKey)
          ? (this.secretEncryptionService.encryptVersioned(
              validatedApiKey as PlaintextString,
              { workspaceId },
            ) as string)
          : (existingProvider?.encryptedApiKey ?? null),
        baseUrl: baseUrl ?? existingProvider?.baseUrl ?? null,
        defaultModel: defaultModel ?? existingProvider?.defaultModel ?? null,
        fastModel: fastModel ?? existingProvider?.fastModel ?? null,
      },
      ['workspaceId', 'provider'],
    );
  }

  async removeProvider({
    workspaceId,
    provider,
  }: {
    workspaceId: string;
    provider: string;
  }): Promise<void> {
    await this.workspaceAiProviderRepository.delete(workspaceId, { provider });
  }

  private toResolvedProvider(
    row: WorkspaceAiProviderEntity,
  ): ResolvedWorkspaceAiProvider {
    const providerConfig = aiProviderConfigSchema.safeParse({
      npm: row.npm,
      label: row.label ?? undefined,
      apiKey: this.decryptApiKeyOrThrow(row),
      baseUrl: row.baseUrl ?? undefined,
    });

    if (!providerConfig.success) {
      throw new AiException(
        `Stored workspace AI provider "${row.provider}" is not a supported configuration.`,
        AiExceptionCode.INVALID_AGENT_INPUT,
      );
    }

    return {
      providerName: row.provider,
      providerConfig: providerConfig.data,
      defaultModel: row.defaultModel,
      fastModel: row.fastModel,
    };
  }

  // The decryption error is replaced by a safe one: the raw error can echo the
  // envelope or key-derivation inputs, neither of which may reach a client.
  private decryptApiKeyOrThrow(
    row: WorkspaceAiProviderEntity,
  ): string | undefined {
    if (!isNonEmptyString(row.encryptedApiKey)) {
      return undefined;
    }

    try {
      return this.secretEncryptionService.decryptVersionedOrThrow(
        row.encryptedApiKey as EncryptedString,
        { workspaceId: row.workspaceId },
      );
    } catch {
      throw new AiException(
        `Stored API key for workspace AI provider "${row.provider}" could not be decrypted. Re-add the key from Settings.`,
        AiExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }
  }
}
