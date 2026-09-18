import {
  type ChatMessage,
  type ChatThreadReplyMap,
} from '@/chat/types/ChatMessage';

const byCreatedAtAscending = (
  firstMessage: ChatMessage,
  secondMessage: ChatMessage,
) =>
  firstMessage.createdAt.localeCompare(secondMessage.createdAt) ||
  firstMessage.id.localeCompare(secondMessage.id);

// Splits a flat channel history into top-level messages and replies-by-parent.
// Replies stay ordered oldest-first so an expanded thread renders in reading
// order regardless of the newest-first page the server returns.
export const buildChatThreadReplyMap = (
  messages: ChatMessage[],
): ChatThreadReplyMap => {
  const repliesByParentId: ChatThreadReplyMap = {};

  for (const message of messages) {
    if (message.threadParentId === null) {
      continue;
    }

    const replies = repliesByParentId[message.threadParentId] ?? [];

    replies.push(message);
    repliesByParentId[message.threadParentId] = replies;
  }

  for (const replies of Object.values(repliesByParentId)) {
    replies.sort(byCreatedAtAscending);
  }

  return repliesByParentId;
};

export const getTopLevelChatMessages = (
  messages: ChatMessage[],
): ChatMessage[] =>
  messages
    .filter((message) => message.threadParentId === null)
    .sort(byCreatedAtAscending);

export const getChatThreadReplyCount = (
  repliesByParentId: ChatThreadReplyMap,
  parentMessageId: string,
): number => repliesByParentId[parentMessageId]?.length ?? 0;
