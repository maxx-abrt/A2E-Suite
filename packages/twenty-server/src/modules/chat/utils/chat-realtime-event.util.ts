// Realtime payloads fanned out on `workspace:<id>:chat:<channelId>` for the
// durable chat writes (messages, reactions, read cursors). Typing stays in
// ChatTypingService because it is ephemeral and never persisted. Every builder
// is pure: the service resolves ids and unread counts, these shape the event
// the gateway serializes into its envelope.
export const CHAT_MESSAGE_CREATED_EVENT_TYPE = 'chat.message.created';
export const CHAT_MESSAGE_UPDATED_EVENT_TYPE = 'chat.message.updated';
export const CHAT_MESSAGE_DELETED_EVENT_TYPE = 'chat.message.deleted';
export const CHAT_REACTION_CREATED_EVENT_TYPE = 'chat.reaction.created';
export const CHAT_REACTION_DELETED_EVENT_TYPE = 'chat.reaction.deleted';
export const CHAT_READ_UPDATED_EVENT_TYPE = 'chat.read.updated';

export type ChatMessageEventType =
  | typeof CHAT_MESSAGE_CREATED_EVENT_TYPE
  | typeof CHAT_MESSAGE_UPDATED_EVENT_TYPE
  | typeof CHAT_MESSAGE_DELETED_EVENT_TYPE;

export type ChatReactionEventType =
  | typeof CHAT_REACTION_CREATED_EVENT_TYPE
  | typeof CHAT_REACTION_DELETED_EVENT_TYPE;

export type ChatRealtimeMessage = {
  id: string;
  channelId: string;
  authorId: string | null;
  body: string | null;
  threadParentId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export type ChatRealtimeReaction = {
  id: string;
  messageId: string;
  workspaceMemberId: string | null;
  emoji: string;
};

export type ChatRealtimeRead = {
  workspaceMemberId: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  unreadCount: number;
};

export type ChatMessageRealtimeEvent = {
  type: ChatMessageEventType;
  workspaceId: string;
  channelId: string;
  occurredAt: string;
  message: ChatRealtimeMessage;
};

export type ChatReactionRealtimeEvent = {
  type: ChatReactionEventType;
  workspaceId: string;
  channelId: string;
  occurredAt: string;
  reaction: ChatRealtimeReaction;
};

export type ChatReadRealtimeEvent = {
  type: typeof CHAT_READ_UPDATED_EVENT_TYPE;
  workspaceId: string;
  channelId: string;
  occurredAt: string;
  read: ChatRealtimeRead;
};

export type ChatRealtimeEvent =
  | ChatMessageRealtimeEvent
  | ChatReactionRealtimeEvent
  | ChatReadRealtimeEvent;

export const buildChatMessageRealtimeEvent = ({
  type,
  workspaceId,
  message,
  occurredAt,
}: {
  type: ChatMessageEventType;
  workspaceId: string;
  message: ChatRealtimeMessage;
  occurredAt: string;
}): ChatMessageRealtimeEvent => ({
  type,
  workspaceId,
  channelId: message.channelId,
  occurredAt,
  message,
});

export const buildChatReactionRealtimeEvent = ({
  type,
  workspaceId,
  channelId,
  reaction,
  occurredAt,
}: {
  type: ChatReactionEventType;
  workspaceId: string;
  channelId: string;
  reaction: ChatRealtimeReaction;
  occurredAt: string;
}): ChatReactionRealtimeEvent => ({
  type,
  workspaceId,
  channelId,
  occurredAt,
  reaction,
});

export const buildChatReadRealtimeEvent = ({
  workspaceId,
  channelId,
  read,
  occurredAt,
}: {
  workspaceId: string;
  channelId: string;
  read: ChatRealtimeRead;
  occurredAt: string;
}): ChatReadRealtimeEvent => ({
  type: CHAT_READ_UPDATED_EVENT_TYPE,
  workspaceId,
  channelId,
  occurredAt,
  read,
});
