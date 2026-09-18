import { useMutation } from '@apollo/client/react';
import { useCallback } from 'react';

import { ARCHIVE_INBOX_NOTIFICATIONS_MUTATION } from '@/inbox/graphql/mutations/archiveInboxNotificationsMutation';
import { MARK_INBOX_NOTIFICATIONS_AS_READ_MUTATION } from '@/inbox/graphql/mutations/markInboxNotificationsAsReadMutation';
import { INBOX_NOTIFICATIONS_QUERY } from '@/inbox/graphql/queries/inboxNotificationsQuery';
import { INBOX_UNREAD_COUNT_QUERY } from '@/inbox/graphql/queries/inboxUnreadCountQuery';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

// Bulk actions are one mutation per selection. Both refetch the list and the
// unread count so the page never keeps a hand-maintained counter in sync.
export const useInboxBulkActions = () => {
  const apolloCoreClient = useApolloCoreClient();

  const [markNotificationsAsRead] = useMutation(
    MARK_INBOX_NOTIFICATIONS_AS_READ_MUTATION,
    { client: apolloCoreClient },
  );

  const [archiveNotifications] = useMutation(
    ARCHIVE_INBOX_NOTIFICATIONS_MUTATION,
    { client: apolloCoreClient },
  );

  const markAsRead = useCallback(
    async (notificationIds: string[]) => {
      if (notificationIds.length === 0) {
        return;
      }

      await markNotificationsAsRead({
        variables: { notificationIds },
        refetchQueries: [INBOX_NOTIFICATIONS_QUERY, INBOX_UNREAD_COUNT_QUERY],
        awaitRefetchQueries: true,
      });
    },
    [markNotificationsAsRead],
  );

  const archive = useCallback(
    async (notificationIds: string[]) => {
      if (notificationIds.length === 0) {
        return;
      }

      await archiveNotifications({
        variables: { notificationIds },
        refetchQueries: [INBOX_NOTIFICATIONS_QUERY, INBOX_UNREAD_COUNT_QUERY],
        awaitRefetchQueries: true,
      });
    },
    [archiveNotifications],
  );

  return { markAsRead, archive };
};
