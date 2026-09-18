export type ChatMessage = {
  id: string;
  body: string;
  channelId: string;
  authorId: string | null;
  threadParentId: string | null;
  createdAt: string;
  editedAt: string | null;
};

// Replies keyed by parent message id. A plain record keeps the pure grouping
// helpers serializable and trivial to assert in tests.
export type ChatThreadReplyMap = Record<string, ChatMessage[]>;

export type ChatMessageBodySegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string; workspaceMemberId: string };

export type ChatReadState = {
  firstUnreadMessageId: string | null;
};
