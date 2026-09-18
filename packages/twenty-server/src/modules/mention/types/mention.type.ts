// The three surfaces a workspace member can be mentioned on. Each carries its
// own wire format (chat Markdown-lite, BlockNote document body, BlockNote
// comment body) but shares one parsing/notification contract (P8.2).
export const MENTION_SURFACES = ['document', 'chat', 'comment'] as const;

export type MentionSurface = (typeof MENTION_SURFACES)[number];

// Where the mention lives, used both to permission-check the target and to
// build the inbox payload the front deep-links from.
export type MentionSource =
  | { surface: 'chat'; channelId: string; messageId: string }
  | { surface: 'document'; documentId: string }
  | { surface: 'comment'; documentId: string; threadId: string };

export type MentionTarget = {
  workspaceMemberId: string;
  userId: string;
};

export type MentionExtraction = {
  mentionedWorkspaceMemberIds: string[];
  contextSnippet: string;
};

// A single comment projected from a BlockNote thread with its own mention ids,
// so the comment listener can notify per newly added comment instead of
// collapsing a whole thread edit into one notification.
export type CommentMentionExtraction = {
  commentId: string | null;
  extraction: MentionExtraction;
};
