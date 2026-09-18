import { type ChatMessage } from '@/chat/types/ChatMessage';

// Mirror of the server `chat-realtime-event.util.ts` payloads fanned out on
// `workspace:<id>:chat:<channelId>`. Kept local to the chat page because the
// events are produced by the server domain module, not the metadata codegen
// surface. Typing reuses the same union so one hook handles every event.
export const CHAT_MESSAGE_CREATED_EVENT_TYPE = 'chat.message.created';
export const CHAT_MESSAGE_UPDATED_EVENT_TYPE = 'chat.message.updated';
export const CHAT_MESSAGE_DELETED_EVENT_TYPE = 'chat.message.deleted';
export const CHAT_REACTION_CREATED_EVENT_TYPE = 'chat.reaction.created';
export const CHAT_REACTION_DELETED_EVENT_TYPE = 'chat.reaction.deleted';
export const CHAT_READ_UPDATED_EVENT_TYPE = 'chat.read.updated';
export const CHAT_TYPING_EVENT_TYPE = 'chat.typing';

// The server row carries `deletedAt` (soft-delete tombstone); the page-level
// `ChatMessage` projection drops it because the query already filters live
// rows. The event therefore keeps its own wider shape.
export type ChatRealtimeMessage = ChatMessage & {
  deletedAt: string | null;
};

export type ChatRealtimeMessageEvent = {
  type:
    | typeof CHAT_MESSAGE_CREATED_EVENT_TYPE
    | typeof CHAT_MESSAGE_UPDATED_EVENT_TYPE
    | typeof CHAT_MESSAGE_DELETED_EVENT_TYPE;
  workspaceId: string;
  channelId: string;
  occurredAt: string;
  message: ChatRealtimeMessage;
};

export type ChatRealtimeReadEvent = {
  type: typeof CHAT_READ_UPDATED_EVENT_TYPE;
  workspaceId: string;
  channelId: string;
  occurredAt: string;
  read: {
    workspaceMemberId: string;
    lastReadMessageId: string | null;
    lastReadAt: string | null;
    unreadCount: number;
  };
};

export type ChatRealtimeTypingEvent = {
  type: typeof CHAT_TYPING_EVENT_TYPE;
  workspaceId: string;
  channelId: string;
  workspaceMemberId: string;
  isTyping: boolean;
  occurredAt: string;
};

// Reactions carry only ids: the message pane resolves the emoji against the
// message it is attached to, and the chat page does not render a reaction
// rollup yet, so the union stays explicit rather than pretending to apply.
export type ChatRealtimeReactionEvent = {
  type:
    | typeof CHAT_REACTION_CREATED_EVENT_TYPE
    | typeof CHAT_REACTION_DELETED_EVENT_TYPE;
  workspaceId: string;
  channelId: string;
  occurredAt: string;
  reaction: {
    id: string;
    messageId: string;
    workspaceMemberId: string | null;
    emoji: string;
  };
};

export type ChatRealtimeEvent =
  | ChatRealtimeMessageEvent
  | ChatRealtimeReadEvent
  | ChatRealtimeTypingEvent
  | ChatRealtimeReactionEvent;
