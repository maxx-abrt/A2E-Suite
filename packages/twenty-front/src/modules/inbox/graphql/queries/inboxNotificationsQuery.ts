import { gql } from '@apollo/client';

import { type InboxNotification } from '@/inbox/types/InboxNotification';

// Hand-written for the same reason as `chatUnreadCounts`: the notification
// inbox is a core-schema resolver, not a metadata object, so it is not part of
// the metadata codegen surface.
export const INBOX_NOTIFICATIONS_QUERY = gql`
  query InboxNotifications($includeArchived: Boolean) {
    notifications(includeArchived: $includeArchived) {
      id
      type
      payload
      createdAt
      readAt
      archivedAt
    }
  }
`;

export type InboxNotificationsQueryResult = {
  notifications: InboxNotification[];
};
