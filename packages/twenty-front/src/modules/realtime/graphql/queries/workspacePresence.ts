import { gql } from '@apollo/client';

// Hand-written until the next metadata GraphQL generation pass. The server
// field is additive and lives in the core schema.
export const WORKSPACE_PRESENCE_QUERY = gql`
  query WorkspacePresence {
    workspacePresence {
      userId
      workspaceMemberId
      lastSeenAt
      isTyping
      typingContext
    }
  }
`;
