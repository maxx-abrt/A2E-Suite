import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import {
  CHAT_MESSAGES_QUERY,
  type ChatMessagesQueryResult,
  type ChatMessagesQueryVariables,
} from '@/chat/graphql/queries/chatMessagesQuery';
import { type ChatMessage } from '@/chat/types/ChatMessage';

export const CHAT_MESSAGES_PAGE_SIZE = 50;

// Reads the newest-first keyset page for one channel and folds it into the
// oldest-first list the thread pane renders. Soft-deleted messages are dropped
// here so the list never shows a tombstone.
export const useChatMessages = ({
  channelId,
  limit = CHAT_MESSAGES_PAGE_SIZE,
}: {
  channelId: string | null;
  limit?: number;
}) => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error } = useQuery<
    ChatMessagesQueryResult,
    ChatMessagesQueryVariables
  >(CHAT_MESSAGES_QUERY, {
    variables: {
      channelId: channelId ?? '',
      limit,
    },
    skip: channelId === null,
    client: apolloCoreClient,
  });

  const messages = useMemo<ChatMessage[]>(() => {
    const nodes = data?.chatMessages.edges.map((edge) => edge.node) ?? [];

    return nodes
      .filter((node) => node.deletedAt === null)
      .map((node) => ({
        id: node.id,
        body: node.body ?? '',
        channelId: node.channelId,
        authorId: node.authorId,
        threadParentId: node.threadParentId,
        createdAt: node.createdAt,
        editedAt: node.editedAt,
      }))
      .sort(
        (firstMessage, secondMessage) =>
          firstMessage.createdAt.localeCompare(secondMessage.createdAt) ||
          firstMessage.id.localeCompare(secondMessage.id),
      );
  }, [data]);

  return { messages, loading, error };
};
