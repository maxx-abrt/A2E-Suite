import { type ChatMessageRecord } from 'src/modules/chat/types/chat-message.type';
import {
  buildChatMessagePage,
  decodeChatMessageCursor,
  encodeChatMessageCursor,
} from 'src/modules/chat/utils/chat-message-cursor.util';

const record = (
  id: string,
  createdAt: string,
  overrides: Partial<ChatMessageRecord> = {},
): ChatMessageRecord => ({
  id,
  body: `body-${id}`,
  channelId: '20202020-0000-4000-8000-0000000000aa',
  authorId: null,
  threadParentId: null,
  createdAt,
  editedAt: null,
  deletedAt: null,
  ...overrides,
});

describe('chat message cursor', () => {
  it('round-trips a (createdAt, id) position', () => {
    const cursor = encodeChatMessageCursor({
      createdAt: '2026-09-18T10:00:00.000Z',
      id: 'message-1',
    });

    expect(decodeChatMessageCursor(cursor)).toEqual({
      createdAt: '2026-09-18T10:00:00.000Z',
      id: 'message-1',
    });
  });

  it('keeps two same-millisecond messages distinct', () => {
    const createdAt = '2026-09-18T10:00:00.000Z';

    expect(encodeChatMessageCursor({ createdAt, id: 'message-1' })).not.toEqual(
      encodeChatMessageCursor({ createdAt, id: 'message-2' }),
    );
  });

  it('rejects a malformed cursor instead of paging from nowhere', () => {
    expect(decodeChatMessageCursor('not-base64-json')).toBeNull();

    const missingId = Buffer.from(
      JSON.stringify({ createdAt: '2026-09-18T10:00:00.000Z' }),
      'utf8',
    ).toString('base64url');

    expect(decodeChatMessageCursor(missingId)).toBeNull();

    const emptyId = Buffer.from(
      JSON.stringify({ createdAt: '2026-09-18T10:00:00.000Z', id: '' }),
      'utf8',
    ).toString('base64url');

    expect(decodeChatMessageCursor(emptyId)).toBeNull();
  });
});

describe('buildChatMessagePage', () => {
  it('returns no edges and no cursor for an empty channel', () => {
    expect(buildChatMessagePage({ records: [], limit: 3 })).toEqual({
      edges: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    });
  });

  it('reports hasNextPage false when the channel fits in one page', () => {
    const page = buildChatMessagePage({
      records: [
        record('message-2', '2026-09-18T10:00:02.000Z'),
        record('message-1', '2026-09-18T10:00:01.000Z'),
      ],
      limit: 3,
    });

    expect(page.edges.map((edge) => edge.node.id)).toEqual([
      'message-2',
      'message-1',
    ]);
    expect(page.pageInfo.hasNextPage).toBe(false);
    expect(page.pageInfo.endCursor).toBe(
      encodeChatMessageCursor(record('message-1', '2026-09-18T10:00:01.000Z')),
    );
  });

  it('trims the lookahead row and points endCursor at the last kept message', () => {
    const page = buildChatMessagePage({
      records: [
        record('message-3', '2026-09-18T10:00:03.000Z'),
        record('message-2', '2026-09-18T10:00:02.000Z'),
        record('message-1', '2026-09-18T10:00:01.000Z'),
      ],
      limit: 2,
    });

    expect(page.edges.map((edge) => edge.node.id)).toEqual([
      'message-3',
      'message-2',
    ]);
    expect(page.pageInfo.hasNextPage).toBe(true);
    expect(page.pageInfo.endCursor).toBe(
      encodeChatMessageCursor(record('message-2', '2026-09-18T10:00:02.000Z')),
    );
  });
});
