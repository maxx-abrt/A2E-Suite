import { gql } from '@apollo/client';

export const INBOX_UNREAD_COUNT_QUERY = gql`
  query InboxUnreadCount {
    notificationUnreadCount
  }
`;

export type InboxUnreadCountQueryResult = {
  notificationUnreadCount: number;
};
