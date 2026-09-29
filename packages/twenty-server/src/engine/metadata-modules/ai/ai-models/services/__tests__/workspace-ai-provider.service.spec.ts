import { type SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';
import { WorkspaceAiProviderEntity } from 'src/engine/metadata-modules/ai/ai-models/entities/workspace-ai-provider.entity';
import { WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';
import { type WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ENCRYPTED_KEY = 'enc:v2:deadbeef:ciphertext-that-must-not-leak';

const buildEntity = (
  overrides: Partial<WorkspaceAiProviderEntity> = {},
): WorkspaceAiProviderEntity =>
  ({
    id: 'provider-id',
    workspaceId: WORKSPACE_ID,
    provider: 'openai',
    npm: '@ai-sdk/openai',
    label: 'OpenAI',
    encryptedApiKey: ENCRYPTED_KEY,
    baseUrl: null,
    defaultModel: 'gpt-4o',
    fastModel: 'gpt-4o-mini',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as WorkspaceAiProviderEntity;

const buildService = ({
  existingProvider = null,
  decrypt = jest.fn().mockReturnValue('sk-plaintext-key'),
}: {
  existingProvider?: WorkspaceAiProviderEntity | null;
  decrypt?: jest.Mock;
} = {}) => {
  const repository = {
    find: jest.fn().mockResolvedValue([]),
    findOneBy: jest.fn().mockResolvedValue(existingProvider),
    upsertAndReturnOne: jest.fn().mockResolvedValue(buildEntity()),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const secretEncryptionService = {
    encryptVersioned: jest.fn().mockReturnValue(ENCRYPTED_KEY),
    decryptVersionedOrThrow: decrypt,
  };

  const service = new WorkspaceAiProviderService(
    repository as unknown as WorkspaceScopedRepository<WorkspaceAiProviderEntity>,
    secretEncryptionService as unknown as SecretEncryptionService,
  );

  return { service, repository, secretEncryptionService };
};

describe('WorkspaceAiProviderService', () => {
  it('encrypts the API key on upsert and never writes the plaintext', async () => {
    const { service, repository, secretEncryptionService } = buildService();

    await service.upsertProvider({
      workspaceId: WORKSPACE_ID,
      provider: 'openai',
      npm: '@ai-sdk/openai',
      apiKey: 'sk-plaintext-key',
    });

    expect(secretEncryptionService.encryptVersioned).toHaveBeenCalledWith(
      'sk-plaintext-key',
      { workspaceId: WORKSPACE_ID },
    );

    const [workspaceIdArg, entityArg] =
      repository.upsertAndReturnOne.mock.calls[0];

    expect(workspaceIdArg).toBe(WORKSPACE_ID);
    expect(entityArg.encryptedApiKey).toBe(ENCRYPTED_KEY);
    expect(JSON.stringify(entityArg)).not.toContain('sk-plaintext-key');
  });

  it('keeps the stored ciphertext when an update omits the API key', async () => {
    const { service, repository } = buildService({
      existingProvider: buildEntity(),
    });

    await service.upsertProvider({
      workspaceId: WORKSPACE_ID,
      provider: 'openai',
      npm: '@ai-sdk/openai',
      defaultModel: 'gpt-4.1',
    });

    const [, entityArg] = repository.upsertAndReturnOne.mock.calls[0];

    expect(entityArg.encryptedApiKey).toBe(ENCRYPTED_KEY);
    expect(entityArg.defaultModel).toBe('gpt-4.1');
  });

  it('rejects a new provider without an API key', async () => {
    const { service } = buildService();

    await expect(
      service.upsertProvider({
        workspaceId: WORKSPACE_ID,
        provider: 'openai',
        npm: '@ai-sdk/openai',
      }),
    ).rejects.toThrow(AiException);
  });

  it('decrypts the API key when resolving the provider', async () => {
    const { service, repository } = buildService();

    repository.find.mockResolvedValue([buildEntity()]);

    const [resolvedProvider] = await service.resolveProviders(WORKSPACE_ID);

    expect(resolvedProvider.providerConfig.apiKey).toBe('sk-plaintext-key');
    expect(resolvedProvider.defaultModel).toBe('gpt-4o');
  });

  it('throws a safe error when the stored key cannot be decrypted', async () => {
    const decrypt = jest.fn().mockImplementation(() => {
      throw new Error(`bad envelope: ${ENCRYPTED_KEY}`);
    });
    const { service, repository } = buildService({ decrypt });

    repository.find.mockResolvedValue([buildEntity()]);

    const resolution = service.resolveProviders(WORKSPACE_ID);

    await expect(resolution).rejects.toMatchObject({
      code: AiExceptionCode.API_KEY_NOT_CONFIGURED,
    });
    await expect(resolution).rejects.not.toThrow(ENCRYPTED_KEY);
  });

  it('removes the provider scoped to the workspace', async () => {
    const { service, repository } = buildService();

    await service.removeProvider({
      workspaceId: WORKSPACE_ID,
      provider: 'openai',
    });

    expect(repository.delete).toHaveBeenCalledWith(WORKSPACE_ID, {
      provider: 'openai',
    });
  });
});
