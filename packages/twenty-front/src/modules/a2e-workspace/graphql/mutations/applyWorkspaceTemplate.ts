import { gql } from '@apollo/client';

// Hand-written document (not codegen-generated yet): the metadata schema on
// running servers gains applyWorkspaceTemplate with this exact shape; switch
// to the generated *Document from ~/generated-metadata/graphql after running
// npx nx run twenty-front:graphql:generate against an updated server.
export const APPLY_WORKSPACE_TEMPLATE = gql`
  mutation ApplyWorkspaceTemplate($input: ApplyWorkspaceTemplateInput!) {
    applyWorkspaceTemplate(input: $input) {
      success
    }
  }
`;
