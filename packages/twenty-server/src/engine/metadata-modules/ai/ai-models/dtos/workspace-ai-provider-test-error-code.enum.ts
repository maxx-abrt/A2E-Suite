import { registerEnumType } from '@nestjs/graphql';

export enum WorkspaceAiProviderTestErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  PROVIDER_UNREACHABLE = 'PROVIDER_UNREACHABLE',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

registerEnumType(WorkspaceAiProviderTestErrorCode, {
  name: 'WorkspaceAiProviderTestErrorCode',
  description: 'Safe, client-facing classification of a failed provider test.',
});
