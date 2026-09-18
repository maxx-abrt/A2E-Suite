// The exact projection ChatMessageService selects from the app-owned
// `chatMessage` workspace object. Keeping it here lets the cursor utilities
// stay pure and unit-testable without the ORM.
export type ChatMessageRecord = {
  id: string;
  body: string | null;
  channelId: string;
  authorId: string | null;
  threadParentId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export type ChatMessageCursor = {
  createdAt: string;
  id: string;
};

export type ChatMessageEdge = {
  node: ChatMessageRecord;
  cursor: string;
};

export type ChatMessagePage = {
  edges: ChatMessageEdge[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};
