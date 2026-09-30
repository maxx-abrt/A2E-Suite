import { gql } from '@apollo/client';

export const REMOVE_WORKSPACE_AI_PROVIDER = gql`
  mutation RemoveWorkspaceAiProvider($provider: String!) {
    removeWorkspaceAiProvider(provider: $provider) {
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
