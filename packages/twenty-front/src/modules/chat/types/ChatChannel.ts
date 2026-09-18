export const CHAT_CHANNEL_KINDS = ['WORKSPACE', 'PROJECT', 'CUSTOM'] as const;

export type ChatChannelKind = (typeof CHAT_CHANNEL_KINDS)[number];

export type ChatChannelVisibility = 'PUBLIC' | 'PRIVATE';

// Mirror of the a2e-chat `chatChannel` metadata object projection the sidebar
// needs. Kept local to the chat page rather than generated, because the object
// is app-owned metadata and the fields we render are a stable subset.
export type ChatChannel = {
  id: string;
  name: string;
  kind: ChatChannelKind;
  visibility: ChatChannelVisibility;
  topic: string | null;
};

export type ChatChannelSection = {
  kind: ChatChannelKind;
  channels: ChatChannel[];
};

export type ChatChannelUnreadCount = {
  channelId: string;
  unreadCount: number;
};
