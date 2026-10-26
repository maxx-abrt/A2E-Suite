import { gql } from '@apollo/client';

import { type ChatMessage } from '@/chat/types/ChatMessage';

// The alias preserves channel results while Syna owns chatMessages(threadId).
export const CHAT_MESSAGES_QUERY = gql`
  query ChatMessages($channelId: UUID!, $limit: Int, $after: String) {
    chatMessages: workspaceChatMessages(
      channelId: $channelId
      limit: $limit
      after: $after
    ) {
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
