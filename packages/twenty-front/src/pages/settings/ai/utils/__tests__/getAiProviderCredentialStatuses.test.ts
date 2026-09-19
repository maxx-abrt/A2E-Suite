import {
  AI_PROVIDER_CREDENTIAL_MASK,
  getAiProviderCredentialStatuses,
} from '~/pages/settings/ai/utils/getAiProviderCredentialStatuses';
import { type ClientAiModelConfig } from '~/generated-metadata/graphql';

const buildModel = (
  overrides: Partial<ClientAiModelConfig> &
    Pick<ClientAiModelConfig, 'modelId'>,
): ClientAiModelConfig => ({
  label: overrides.modelId,
  ...overrides,
});

describe('getAiProviderCredentialStatuses', () => {
  it('groups models by provider and never exposes a credential', () => {
    const statuses = getAiProviderCredentialStatuses([
      buildModel({
        modelId: 'openai/gpt-4o',
        providerName: 'openai',
        providerLabel: 'OpenAI',
      }),
      buildModel({
        modelId: 'openai/gpt-4o-mini',
        providerName: 'openai',
        providerLabel: 'OpenAI',
      }),
      buildModel({
        modelId: 'anthropic/claude',
        providerName: 'anthropic',
        providerLabel: 'Anthropic',
      }),
    ]);

    expect(statuses).toEqual([
      {
        providerName: 'anthropic',
        providerLabel: 'Anthropic',
        availableModelCount: 1,
        maskedCredential: AI_PROVIDER_CREDENTIAL_MASK,
      },
      {
        providerName: 'openai',
        providerLabel: 'OpenAI',
        availableModelCount: 2,
        maskedCredential: AI_PROVIDER_CREDENTIAL_MASK,
      },
    ]);

    statuses.forEach((status) => {
      expect(status.maskedCredential).toBe(AI_PROVIDER_CREDENTIAL_MASK);
      expect(status.maskedCredential).not.toContain(status.providerName);
    });
  });

  it('falls back to the provider name when no label is present', () => {
    const statuses = getAiProviderCredentialStatuses([
      buildModel({ modelId: 'azure/gpt-4o', providerName: 'azure' }),
    ]);

    expect(statuses).toEqual([
      {
        providerName: 'azure',
        providerLabel: 'azure',
        availableModelCount: 1,
        maskedCredential: AI_PROVIDER_CREDENTIAL_MASK,
      },
    ]);
  });

  it('ignores models that carry no provider name', () => {
    const statuses = getAiProviderCredentialStatuses([
      buildModel({ modelId: 'auto/smart' }),
      buildModel({ modelId: 'openai/gpt-4o', providerName: 'openai' }),
    ]);

    expect(statuses).toHaveLength(1);
    expect(statuses[0].providerName).toBe('openai');
  });

  it('returns an empty list when there is no configured provider', () => {
    expect(getAiProviderCredentialStatuses([])).toEqual([]);
  });
});
