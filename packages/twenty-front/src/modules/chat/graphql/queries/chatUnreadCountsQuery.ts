import { gql } from '@apollo/client';

import { type ChatChannelUnreadCount } from '@/chat/types/ChatChannel';

// Hand-written for the same reason as `chatMessages`: `chatUnreadCounts` is a
// server custom resolver, one row per channel the member follows.
export const CHAT_UNREAD_COUNTS_QUERY = gql`
  query ChatUnreadCounts {
    chatUnreadCounts {
      channelId
      unreadCount
    }
  }
`;

export type ChatUnreadCountsQueryResult = {
  chatUnreadCounts: ChatChannelUnreadCount[];
};
