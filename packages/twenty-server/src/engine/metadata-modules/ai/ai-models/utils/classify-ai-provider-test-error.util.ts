import { WorkspaceAiProviderTestErrorCode } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider-test-error-code.enum';

const hasNumericStatusCode = (
  error: unknown,
): error is { statusCode: number } =>
  typeof error === 'object' &&
  error !== null &&
  typeof (error as { statusCode?: unknown }).statusCode === 'number';

// Provider error bodies can echo key material, so the raw error is only ever
// classified here — never surfaced to a client.
export const classifyAiProviderTestError = (
  error: unknown,
): WorkspaceAiProviderTestErrorCode => {
  if (hasNumericStatusCode(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return WorkspaceAiProviderTestErrorCode.INVALID_API_KEY;
    }

    if (error.statusCode === 404) {
      return WorkspaceAiProviderTestErrorCode.MODEL_NOT_FOUND;
    }

    // Google returns 400 for an invalid key; a 400/422 on our minimal,
    // SDK-built request is a rejected configuration rather than a server fault.
    if (error.statusCode === 400 || error.statusCode === 422) {
      return WorkspaceAiProviderTestErrorCode.INVALID_CONFIGURATION;
    }

    return WorkspaceAiProviderTestErrorCode.UNKNOWN_ERROR;
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return WorkspaceAiProviderTestErrorCode.PROVIDER_UNREACHABLE;
    }

    if (error instanceof TypeError) {
      return WorkspaceAiProviderTestErrorCode.PROVIDER_UNREACHABLE;
    }
  }

  return WorkspaceAiProviderTestErrorCode.UNKNOWN_ERROR;
};
