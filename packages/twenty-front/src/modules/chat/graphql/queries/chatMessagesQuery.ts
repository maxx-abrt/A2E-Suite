import { gql } from '@apollo/client';

import { type ChatMessage } from '@/chat/types/ChatMessage';

// Hand-written rather than generated: `chatMessages` is a server custom
// resolver (keyset connection scoped to one channel), so it is not part of the
// metadata GraphQL codegen surface. Switch to the generated Document once a
// `modules/chat/graphql` glob is added to codegen-metadata.cjs.
export const CHAT_MESSAGES_QUERY = gql`
  query ChatMessages($channelId: UUID!, $limit: Int, $after: String) {
    chatMessages(channelId: $channelId, limit: $limit, after: $after) {
      edges {
        node {
          id
          body
          channelId
          authorId
          threadParentId
          createdAt
          editedAt
          deletedAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export type ChatMessageQueryNode = ChatMessage & {
  deletedAt: string | null;
};

export type ChatMessagesQueryVariables = {
  channelId: string;
  limit?: number;
  after?: string;
};

export type ChatMessagesQueryResult = {
  chatMessages: {
    edges: { node: ChatMessageQueryNode; cursor: string }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};
