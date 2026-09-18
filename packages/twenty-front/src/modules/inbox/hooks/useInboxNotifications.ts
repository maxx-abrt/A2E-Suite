import { useQuery } from '@apollo/client/react';

import {
  INBOX_NOTIFICATIONS_QUERY,
  type InboxNotificationsQueryResult,
} from '@/inbox/graphql/queries/inboxNotificationsQuery';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

// The inbox page always loads the whole (non-archived) set: the resolver is
// scoped to the caller and the page derives its unread count from the same
// rows, so there is no pagination state to reconcile with realtime inserts.
export const useInboxNotifications = ({
  includeArchived = false,
}: {
  includeArchived?: boolean;
} = {}) => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error } = useQuery<InboxNotificationsQueryResult>(
    INBOX_NOTIFICATIONS_QUERY,
    { client: apolloCoreClient, variables: { includeArchived } },
  );

  return {
    notifications: data?.notifications ?? [],
    loading,
    error,
  };
};
