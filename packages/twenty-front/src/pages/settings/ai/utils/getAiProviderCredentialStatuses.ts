import { isDefined } from 'twenty-shared/utils';

import { type ClientAiModelConfig } from '~/generated-metadata/graphql';

// The audit page must never surface a provider secret; the client config only
// carries resolved models, so every credential is rendered as this fixed mask.
export const AI_PROVIDER_CREDENTIAL_MASK = '••••••••';

export type AiProviderCredentialStatus = {
  providerName: string;
  providerLabel: string;
  availableModelCount: number;
  maskedCredential: string;
};

export const getAiProviderCredentialStatuses = (
  aiModels: ClientAiModelConfig[],
): AiProviderCredentialStatus[] => {
  const statusesByProvider = new Map<string, AiProviderCredentialStatus>();

  aiModels.forEach((model) => {
    if (!isDefined(model.providerName) || model.providerName.length === 0) {
      return;
    }

    const existingStatus = statusesByProvider.get(model.providerName);

    if (existingStatus) {
      existingStatus.availableModelCount += 1;
      return;
    }

    statusesByProvider.set(model.providerName, {
      providerName: model.providerName,
      providerLabel: model.providerLabel ?? model.providerName,
      availableModelCount: 1,
      maskedCredential: AI_PROVIDER_CREDENTIAL_MASK,
    });
  });

  return [...statusesByProvider.values()].sort((first, second) =>
    first.providerLabel.localeCompare(second.providerLabel),
  );
};
