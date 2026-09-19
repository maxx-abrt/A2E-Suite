import { gql } from '@apollo/client';

// Hand-written document: workspaceTemplatePreview/applyWorkspaceTemplateOperation
// are not in the checked-in generated metadata yet; regenerate with
// npx nx run twenty-front:graphql:generate against an updated server, then
// switch to the generated *Document.
export const WORKSPACE_TEMPLATE_PREVIEW = gql`
  query WorkspaceTemplatePreview($template: WorkspaceTemplate!) {
    workspaceTemplatePreview(template: $template) {
      templateKey
      version
      blocked
      apps {
        universalIdentifier
        displayName
        registered
        versionCompatible
        required
        currentlyInstalled
      }
      navigationChanges {
        universalIdentifier
        action
      }
      samples {
        label
        locale
      }
      blockedSamples {
        label
        locale
        blockedBy
      }
    }
  }
`;
