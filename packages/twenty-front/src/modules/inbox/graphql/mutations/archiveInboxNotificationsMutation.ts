import { gql } from '@apollo/client';

export const ARCHIVE_INBOX_NOTIFICATIONS_MUTATION = gql`
  mutation ArchiveInboxNotifications($notificationIds: [UUID!]!) {
    archiveNotifications(notificationIds: $notificationIds)
  }
`;
