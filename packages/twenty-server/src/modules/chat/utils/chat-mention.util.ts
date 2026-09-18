import { type NotificationRequest } from 'src/engine/core-modules/notification/types/notification-request.type';

// Markdown-lite mention wire format shared with the a2e-chat composer:
// `@[label](workspaceMemberId)`. The full mentions engine (shared parser with
// context snippets across docs/chat/comments) is P8.2; this skeleton only needs
// the ids a message references so the notification request can be emitted.
const CHAT_MENTION_PATTERN = /@\[[^\]]*\]\(([^)\s]+)\)/g;

export type ChatMentionTarget = {
  workspaceMemberId: string;
  userId: string;
};

export const extractMentionedWorkspaceMemberIds = (
  body: string | null,
): string[] => {
  if (body === null) {
    return [];
  }

  const ids = new Set<string>();

  for (const match of body.matchAll(CHAT_MENTION_PATTERN)) {
    if (match[1].length > 0) {
      ids.add(match[1]);
    }
  }

  return [...ids];
};

// One request per mentioned user through the P8.1 producer seam. The channel and
// message ids ride in the payload so the inbox deep-links without chat-local
// storage; `mentionedWorkspaceMemberIds` lets P8.2 build the context snippet
// later without re-parsing the body.
export const buildChatMentionNotificationRequests = ({
  channelId,
  messageId,
  authorId,
  mentionedWorkspaceMemberIds,
  targets,
  createdAt,
}: {
  channelId: string;
  messageId: string;
  authorId: string | null;
  mentionedWorkspaceMemberIds: string[];
  targets: ChatMentionTarget[];
  createdAt?: Date;
}): NotificationRequest[] =>
  targets.map((target) => ({
    userId: target.userId,
    type: 'MENTION',
    payload: {
      kind: 'chat.mention',
      channelId,
      messageId,
      authorId,
      mentionedWorkspaceMemberIds,
    },
    // The message moment, not the batch flush time, keeps a replayed event in
    // the same digest window.
    ...(createdAt === undefined ? {} : { createdAt }),
  }));
