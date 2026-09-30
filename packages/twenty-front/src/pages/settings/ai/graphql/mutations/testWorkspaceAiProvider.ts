import { gql } from '@apollo/client';

export const TEST_WORKSPACE_AI_PROVIDER = gql`
  mutation TestWorkspaceAiProvider($input: TestWorkspaceAiProviderInput!) {
    testWorkspaceAiProvider(input: $input) {
      success
      errorCode
      message
      model
    }
  }
`;
