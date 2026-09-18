import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

import {
  CHAT_UNREAD_COUNTS_QUERY,
  type ChatUnreadCountsQueryResult,
} from '@/chat/graphql/queries/chatUnreadCountsQuery';

// One round trip for every followed channel's unread count, so the sidebar can
// bold all of them without N queries.
export const useChatUnreadCounts = () => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error } = useQuery<ChatUnreadCountsQueryResult>(
    CHAT_UNREAD_COUNTS_QUERY,
    { client: apolloCoreClient },
  );

  const unreadCountByChannelId = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const { channelId, unreadCount } of data?.chatUnreadCounts ?? []) {
      counts[channelId] = unreadCount;
    }

    return counts;
  }, [data]);

  return { unreadCountByChannelId, loading, error };
};
