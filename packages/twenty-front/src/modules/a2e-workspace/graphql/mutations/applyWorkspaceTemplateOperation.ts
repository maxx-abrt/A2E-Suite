import { gql } from '@apollo/client';

// Hand-written document: see workspaceTemplatePreview.ts for the codegen note.
export const APPLY_WORKSPACE_TEMPLATE_OPERATION = gql`
  mutation ApplyWorkspaceTemplateOperation(
    $input: ApplyWorkspaceTemplateOperationInput!
  ) {
    applyWorkspaceTemplateOperation(input: $input) {
      operationId
      requestedTemplateKeyVersion {
        key
        version
      }
      appliedTemplateKeyVersion {
        key
        version
      }
      steps {
        kind
        targetUniversalIdentifier
        status
        errorCode
        localizedMessage
      }
    }
  }
`;
