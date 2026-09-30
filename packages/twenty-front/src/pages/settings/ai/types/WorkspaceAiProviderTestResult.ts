export type WorkspaceAiProviderTestErrorCode =
  | 'INVALID_API_KEY'
  | 'MODEL_NOT_FOUND'
  | 'PROVIDER_UNREACHABLE'
  | 'INVALID_CONFIGURATION'
  | 'UNKNOWN_ERROR';

// The server never echoes a provider error body (it can contain key material),
// so the front renders its own localized copy from the typed error code.
export type WorkspaceAiProviderTestResult = {
  success: boolean;
  errorCode: WorkspaceAiProviderTestErrorCode | null;
  message: string | null;
  model: string;
};
