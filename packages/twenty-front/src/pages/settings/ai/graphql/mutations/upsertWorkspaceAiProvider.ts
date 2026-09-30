import { gql } from '@apollo/client';

export const UPSERT_WORKSPACE_AI_PROVIDER = gql`
  mutation UpsertWorkspaceAiProvider($input: UpsertWorkspaceAiProviderInput!) {
    upsertWorkspaceAiProvider(input: $input) {
      resolutionOrder
      providers {
        provider
        label
        npm
        baseUrl
        hasApiKey
        maskedApiKey
        apiKeyConfigVariable
        source
        isCatalogProvider
        defaultModel
        fastModel
        models
      }
    }
  }
`;
