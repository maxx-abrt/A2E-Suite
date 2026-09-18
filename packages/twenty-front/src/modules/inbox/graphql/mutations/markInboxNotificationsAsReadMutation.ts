import { gql } from '@apollo/client';

export const MARK_INBOX_NOTIFICATIONS_AS_READ_MUTATION = gql`
  mutation MarkInboxNotificationsAsRead($notificationIds: [UUID!]!) {
    markNotificationsAsRead(notificationIds: $notificationIds)
  }
`;
