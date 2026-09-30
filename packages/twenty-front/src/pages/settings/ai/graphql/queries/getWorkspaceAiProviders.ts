import { gql } from '@apollo/client';

export const GET_WORKSPACE_AI_PROVIDERS = gql`
  query WorkspaceAiProviders {
    workspaceAiProviders {
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
