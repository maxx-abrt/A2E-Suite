import { t } from '@lingui/core/macro';

import { type WorkspaceAiProviderTestErrorCode } from '~/pages/settings/ai/types/WorkspaceAiProviderTestResult';

export const getWorkspaceAiProviderTestErrorMessage = (
  errorCode: WorkspaceAiProviderTestErrorCode | null,
): string => {
  switch (errorCode) {
    case 'INVALID_API_KEY':
      return t`The provider rejected this API key. Check it and try again.`;
    case 'MODEL_NOT_FOUND':
      return t`The provider does not recognize this model. Check the model id.`;
    case 'PROVIDER_UNREACHABLE':
      return t`The provider could not be reached. Check the base URL and network access.`;
    case 'INVALID_CONFIGURATION':
      return t`The configuration was rejected. Check the API key, the base URL and the model id.`;
    case 'UNKNOWN_ERROR':
    default:
      return t`The key test failed for an unexpected reason.`;
  }
};
