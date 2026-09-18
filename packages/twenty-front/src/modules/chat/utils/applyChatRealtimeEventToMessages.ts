import { isDefined } from 'twenty-shared/utils';

import { type ChatMessage } from '@/chat/types/ChatMessage';
import {
  CHAT_MESSAGE_CREATED_EVENT_TYPE,
  CHAT_MESSAGE_DELETED_EVENT_TYPE,
  CHAT_MESSAGE_UPDATED_EVENT_TYPE,
  CHAT_READ_UPDATED_EVENT_TYPE,
  CHAT_TYPING_EVENT_TYPE,
  type ChatRealtimeEvent,
} from '@/chat/types/ChatRealtimeEvent';

// Folds one realtime event into the loaded message list. Pure so the
// subscription wiring can be unit-tested without a socket: the hook only owns
// subscribe/unsubscribe, this owns what an event means.
//
// Insert-by-id keeps the list idempotent: the optimistic offline replay and
// the server fan-out of the same message both land here and must not duplicate
// the row. Ordering is `(createdAt, id)` — the same keyset the server query
// sorts by.
export const applyChatRealtimeEventToMessages = ({
  messages,
  event,
}: {
  messages: ChatMessage[];
  event: ChatRealtimeEvent;
}): ChatMessage[] => {
  if (
    event.type !== CHAT_MESSAGE_CREATED_EVENT_TYPE &&
    event.type !== CHAT_MESSAGE_UPDATED_EVENT_TYPE &&
    event.type !== CHAT_MESSAGE_DELETED_EVENT_TYPE
  ) {
    return messages;
  }

  const incomingMessage = event.message;

  const withoutIncoming = messages.filter(
    (message) => message.id !== incomingMessage.id,
  );

  // A tombstoned row (soft-deleted) is indistinguishable from a delete event
  // for the pane: either way it leaves the live list.
  if (
    event.type === CHAT_MESSAGE_DELETED_EVENT_TYPE ||
    incomingMessage.deletedAt !== null
  ) {
    return withoutIncoming;
  }

  const nextMessage: ChatMessage = {
    id: incomingMessage.id,
    body: incomingMessage.body ?? '',
    channelId: incomingMessage.channelId,
    authorId: incomingMessage.authorId,
    threadParentId: incomingMessage.threadParentId,
    createdAt: incomingMessage.createdAt,
    editedAt: incomingMessage.editedAt,
  };

  return [...withoutIncoming, nextMessage].sort(
    (firstMessage, secondMessage) =>
      firstMessage.createdAt.localeCompare(secondMessage.createdAt) ||
      firstMessage.id.localeCompare(secondMessage.id),
  );
};

// The read event carries the author's own unread count, so a member viewing
// another channel sees their sidebar badge drop without a refetch.
export const getUnreadCountOverrideFromEvent = (
  event: ChatRealtimeEvent,
): { channelId: string; unreadCount: number } | null => {
  if (event.type !== CHAT_READ_UPDATED_EVENT_TYPE) {
    return null;
  }

  return {
    channelId: event.channelId,
    unreadCount: event.read.unreadCount,
  };
};

export const getTypingWorkspaceMemberIdFromEvent = (
  event: ChatRealtimeEvent,
): string | null => {
  if (event.type !== CHAT_TYPING_EVENT_TYPE || !event.isTyping) {
    return null;
  }

  return isDefined(event.workspaceMemberId) ? event.workspaceMemberId : null;
};
