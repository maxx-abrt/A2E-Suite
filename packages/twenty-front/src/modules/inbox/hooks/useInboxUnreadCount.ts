import { useQuery } from '@apollo/client/react';

import {
  INBOX_UNREAD_COUNT_QUERY,
  type InboxUnreadCountQueryResult,
} from '@/inbox/graphql/queries/inboxUnreadCountQuery';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

// Server-derived unread count (NotificationService.countUnread), the same rows
// the inbox list queries. A realtime event's own `unreadCount` overrides it
// until the next refetch/action.
export const useInboxUnreadCount = () => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error } = useQuery<InboxUnreadCountQueryResult>(
    INBOX_UNREAD_COUNT_QUERY,
    { client: apolloCoreClient },
  );

  return {
    unreadCount: data?.notificationUnreadCount ?? 0,
    loading,
    error,
  };
};
