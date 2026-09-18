import { isDefined } from 'twenty-shared/utils';

import {
  type ChatMessageCursor,
  type ChatMessagePage,
  type ChatMessageRecord,
} from '../types/chat-message.type';

// Keyset cursor over chat history: (createdAt, id) is stable across edits and
// survives a message being deleted, unlike an offset or a bare createdAt
// cursor that two same-millisecond messages would collide on. Base64url over
// JSON, matching the opaque cursor contract of the metadata findMany.
export const encodeChatMessageCursor = (
  record: Pick<ChatMessageRecord, 'createdAt' | 'id'>,
): string =>
  Buffer.from(
    JSON.stringify({ createdAt: record.createdAt, id: record.id }),
    'utf8',
  ).toString('base64url');

export const decodeChatMessageCursor = (
  cursor: string,
): ChatMessageCursor | null => {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as unknown;

    if (
      !isDefined(parsed) ||
      typeof parsed !== 'object' ||
      typeof (parsed as ChatMessageCursor).createdAt !== 'string' ||
      (parsed as ChatMessageCursor).createdAt.length === 0 ||
      typeof (parsed as ChatMessageCursor).id !== 'string' ||
      (parsed as ChatMessageCursor).id.length === 0
    ) {
      return null;
    }

    return {
      createdAt: (parsed as ChatMessageCursor).createdAt,
      id: (parsed as ChatMessageCursor).id,
    };
  } catch {
    return null;
  }
};

// The caller asks for `limit` messages; the repository fetches limit + 1 so
// an extra row proves hasNextPage without a second count query.
export const buildChatMessagePage = ({
  records,
  limit,
}: {
  records: ChatMessageRecord[];
  limit: number;
}): ChatMessagePage => {
  const hasNextPage = records.length > limit;
  const pageRecords = hasNextPage ? records.slice(0, limit) : records;
  const edges = pageRecords.map((node) => ({
    node,
    cursor: encodeChatMessageCursor(node),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
};
