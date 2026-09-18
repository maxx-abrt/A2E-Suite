import {
  aggregateUnreadCounts,
  type ChatUnreadMessage,
} from 'src/modules/chat/utils/chat-unread-count.util';

const MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
const OTHER_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const OTHER_CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000001';

const message = (
  overrides: Partial<ChatUnreadMessage> = {},
): ChatUnreadMessage => ({
  channelId: CHANNEL_ID,
  authorId: OTHER_MEMBER_ID,
  createdAt: '2026-09-18T10:00:00.000Z',
  deletedAt: null,
  ...overrides,
});

describe('aggregateUnreadCounts', () => {
  it('counts only messages newer than the read position', () => {
    const counts = aggregateUnreadCounts({
      messages: [
        message({ createdAt: '2026-09-18T09:00:00.000Z' }),
        message({ createdAt: '2026-09-18T11:00:00.000Z' }),
        message({ createdAt: '2026-09-18T12:00:00.000Z' }),
      ],
      readPositions: [
        { channelId: CHANNEL_ID, lastReadAt: '2026-09-18T10:00:00.000Z' },
      ],
      workspaceMemberId: MEMBER_ID,
    });

    expect(counts).toEqual({ [CHANNEL_ID]: 2 });
  });

  it('never counts your own messages as unread', () => {
    const counts = aggregateUnreadCounts({
      messages: [
        message({ authorId: MEMBER_ID }),
        message({ authorId: OTHER_MEMBER_ID }),
      ],
      readPositions: [{ channelId: CHANNEL_ID, lastReadAt: null }],
      workspaceMemberId: MEMBER_ID,
    });

    expect(counts).toEqual({ [CHANNEL_ID]: 1 });
  });

  it('ignores soft-deleted messages and untracked channels', () => {
    const counts = aggregateUnreadCounts({
      messages: [
        message({ deletedAt: '2026-09-18T11:00:00.000Z' }),
        message({ channelId: OTHER_CHANNEL_ID }),
      ],
      readPositions: [{ channelId: CHANNEL_ID, lastReadAt: null }],
      workspaceMemberId: MEMBER_ID,
    });

    expect(counts).toEqual({ [CHANNEL_ID]: 0 });
  });

  it('aggregates each tracked channel independently', () => {
    const counts = aggregateUnreadCounts({
      messages: [
        message({ createdAt: '2026-09-18T11:00:00.000Z' }),
        message({
          channelId: OTHER_CHANNEL_ID,
          createdAt: '2026-09-18T11:00:00.000Z',
        }),
        message({
          channelId: OTHER_CHANNEL_ID,
          createdAt: '2026-09-18T09:00:00.000Z',
        }),
      ],
      readPositions: [
        { channelId: CHANNEL_ID, lastReadAt: '2026-09-18T10:00:00.000Z' },
        {
          channelId: OTHER_CHANNEL_ID,
          lastReadAt: '2026-09-18T10:00:00.000Z',
        },
      ],
      workspaceMemberId: MEMBER_ID,
    });

    expect(counts).toEqual({ [CHANNEL_ID]: 1, [OTHER_CHANNEL_ID]: 1 });
  });
});
