import { registerEnumType } from '@nestjs/graphql';

export enum WorkspaceAiProviderSource {
  WORKSPACE = 'WORKSPACE',
  INSTANCE = 'INSTANCE',
  CATALOG = 'CATALOG',
}

registerEnumType(WorkspaceAiProviderSource, {
  name: 'WorkspaceAiProviderSource',
  description:
    'Where the provider configuration that wins for this workspace comes from.',
});
