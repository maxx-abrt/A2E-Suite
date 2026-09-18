import { type ChatMessage, type ChatReadState } from '@/chat/types/ChatMessage';

const byCreatedAtAscending = (
  firstMessage: ChatMessage,
  secondMessage: ChatMessage,
) =>
  firstMessage.createdAt.localeCompare(secondMessage.createdAt) ||
  firstMessage.id.localeCompare(secondMessage.id);

// The unread divider sits before the first message the member has not read.
// `lastReadMessageId` is the durable read cursor; when it is absent the member
// has never read the channel, so the divider sits before the oldest message.
// A cursor that no longer resolves (message deleted) yields no divider rather
// than an arbitrary one.
export const getChatReadState = ({
  messages,
  lastReadMessageId,
}: {
  messages: ChatMessage[];
  lastReadMessageId: string | null;
}): ChatReadState => {
  const orderedMessages = [...messages].sort(byCreatedAtAscending);

  if (lastReadMessageId === null) {
    return { firstUnreadMessageId: orderedMessages[0]?.id ?? null };
  }

  const lastReadIndex = orderedMessages.findIndex(
    (message) => message.id === lastReadMessageId,
  );

  if (lastReadIndex === -1) {
    return { firstUnreadMessageId: null };
  }

  return {
    firstUnreadMessageId: orderedMessages[lastReadIndex + 1]?.id ?? null,
  };
};

export const isChatChannelUnread = (unreadCount: number): boolean =>
  unreadCount > 0;
