// Pure transcript shaping for the read-only AI chat tools (P9.2).
//
// The assistant gets authorized message data plus aggregate participant and
// emoji-reaction stats — enough to summarize without the tool ever writing.
// Keeping this here (not in the handler) lets the aggregation be exercised
// without a Core API client.

export type ChatMessageSource = {
  id: string;
  body?: string | null;
  createdAt: string;
  threadParentId?: string | null;
  author?: {
    id?: string | null;
    name?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
  reactions?: { edges?: { node: { emoji?: string | null } }[] } | null;
};

export type ChatTranscriptMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
  body: string;
  threadParentId: string | null;
};

export type ChatTranscriptParticipant = {
  authorId: string | null;
  authorName: string;
  messageCount: number;
};

export type ChatTranscriptReaction = {
  emoji: string;
  count: number;
};

export type ChatTranscript = {
  messages: ChatTranscriptMessage[];
  participants: ChatTranscriptParticipant[];
  reactions: ChatTranscriptReaction[];
};

export const DEFAULT_CHAT_TOOL_MESSAGE_LIMIT = 50;
export const MAX_CHAT_TOOL_MESSAGE_LIMIT = 100;

// The assistant never picks an unbounded read: a missing/invalid limit falls
// back to the default and every value is clamped to [1, MAX].
export const clampChatToolMessageLimit = (
  limit: number | undefined,
): number => {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return DEFAULT_CHAT_TOOL_MESSAGE_LIMIT;
  }

  return Math.min(Math.max(Math.floor(limit), 1), MAX_CHAT_TOOL_MESSAGE_LIMIT);
};

export const formatChatAuthorName = (
  name: { firstName?: string | null; lastName?: string | null } | null | undefined,
): string =>
  [name?.firstName, name?.lastName]
    .filter((part): part is string => typeof part === 'string')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');

export const buildChatTranscript = (
  messages: ChatMessageSource[],
): ChatTranscript => {
  const participantByAuthorKey = new Map<string, ChatTranscriptParticipant>();
  const reactionCountByEmoji = new Map<string, number>();
  const transcriptMessages: ChatTranscriptMessage[] = [];

  for (const message of messages) {
    const authorId = message.author?.id ?? null;
    const authorName = formatChatAuthorName(message.author?.name);
    const authorKey = authorId ?? `anonymous:${authorName}`;
    const existingParticipant = participantByAuthorKey.get(authorKey);

    if (existingParticipant === undefined) {
      participantByAuthorKey.set(authorKey, {
        authorId,
        authorName,
        messageCount: 1,
      });
    } else {
      existingParticipant.messageCount += 1;
    }

    for (const reactionEdge of message.reactions?.edges ?? []) {
      const emoji = reactionEdge.node.emoji;

      if (typeof emoji !== 'string' || emoji.length === 0) {
        continue;
      }

      reactionCountByEmoji.set(emoji, (reactionCountByEmoji.get(emoji) ?? 0) + 1);
    }

    transcriptMessages.push({
      id: message.id,
      authorId,
      authorName,
      createdAt: message.createdAt,
      body: message.body ?? '',
      threadParentId: message.threadParentId ?? null,
    });
  }

  const participants = [...participantByAuthorKey.values()].sort(
    (left, right) =>
      right.messageCount - left.messageCount ||
      left.authorName.localeCompare(right.authorName) ||
      (left.authorId ?? '').localeCompare(right.authorId ?? ''),
  );

  const reactions = [...reactionCountByEmoji.entries()]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.emoji.localeCompare(right.emoji),
    );

  return { messages: transcriptMessages, participants, reactions };
};
