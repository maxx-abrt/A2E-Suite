import { isDefined } from 'twenty-shared/utils';

// Minimal projection the unread aggregation needs. Kept as a plain shape so
// the aggregation is pure and unit-testable without the ORM, mirroring
// chat-message-cursor.util.ts.
export type ChatUnreadMessage = {
  channelId: string;
  authorId: string | null;
  createdAt: string | Date;
  deletedAt: string | null;
};

export type ChatReadPosition = {
  channelId: string;
  lastReadAt: string | Date | null;
};

// Unread = messages in a channel the member tracks, newer than their read
// position, not soft-deleted, and not authored by them (your own messages are
// always read). Aggregation is keyed by channel so the same payload can carry
// a member's unread state across several channels; a read event only reads its
// own channel out of the map. Channels without a read position are ignored —
// the caller only aggregates channels the member actually follows.
export const aggregateUnreadCounts = ({
  messages,
  readPositions,
  workspaceMemberId,
}: {
  messages: ChatUnreadMessage[];
  readPositions: ChatReadPosition[];
  workspaceMemberId: string;
}): Record<string, number> => {
  const unreadCounts: Record<string, number> = {};

  for (const readPosition of readPositions) {
    unreadCounts[readPosition.channelId] = 0;
  }

  for (const message of messages) {
    const readPosition = readPositions.find(
      (candidate) => candidate.channelId === message.channelId,
    );

    if (!isDefined(readPosition)) {
      continue;
    }

    if (
      isDefined(message.deletedAt) ||
      message.authorId === workspaceMemberId
    ) {
      continue;
    }

    if (
      isDefined(readPosition.lastReadAt) &&
      new Date(message.createdAt).getTime() <=
        new Date(readPosition.lastReadAt).getTime()
    ) {
      continue;
    }

    unreadCounts[message.channelId] += 1;
  }

  return unreadCounts;
};
