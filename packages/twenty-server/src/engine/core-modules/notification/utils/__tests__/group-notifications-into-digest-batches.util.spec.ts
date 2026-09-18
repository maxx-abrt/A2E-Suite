import {
  getNotificationDigestWindowStart,
  groupNotificationsIntoDigestBatches,
  type NotificationDigestItem,
} from 'src/engine/core-modules/notification/utils/group-notifications-into-digest-batches.util';

const WINDOW_MS = 15 * 60 * 1000;

const buildItem = (
  overrides: Partial<NotificationDigestItem> = {},
): NotificationDigestItem => ({
  userId: 'user-1',
  type: 'MENTION',
  payload: {},
  createdAt: new Date('2026-09-18T10:00:00.000Z'),
  ...overrides,
});

describe('getNotificationDigestWindowStart', () => {
  it('floors a moment to its aligned window start', () => {
    expect(
      getNotificationDigestWindowStart({
        date: new Date('2026-09-18T10:07:42.000Z'),
        windowMs: WINDOW_MS,
      }).toISOString(),
    ).toBe('2026-09-18T10:00:00.000Z');
  });
});

describe('groupNotificationsIntoDigestBatches', () => {
  it('collapses items in the same aligned window into one batch', () => {
    const batches = groupNotificationsIntoDigestBatches({
      items: [
        buildItem({ createdAt: new Date('2026-09-18T10:01:00.000Z') }),
        buildItem({
          type: 'CHAT_MESSAGE',
          createdAt: new Date('2026-09-18T10:14:59.000Z'),
        }),
      ],
      windowMs: WINDOW_MS,
    });

    expect(batches).toHaveLength(1);
    expect(batches[0].items).toHaveLength(2);
    expect(batches[0].windowStart.toISOString()).toBe(
      '2026-09-18T10:00:00.000Z',
    );
    expect(batches[0].windowEnd.toISOString()).toBe('2026-09-18T10:15:00.000Z');
  });

  it('splits items that fall in different windows', () => {
    const batches = groupNotificationsIntoDigestBatches({
      items: [
        buildItem({ createdAt: new Date('2026-09-18T10:01:00.000Z') }),
        buildItem({ createdAt: new Date('2026-09-18T10:31:00.000Z') }),
      ],
      windowMs: WINDOW_MS,
    });

    expect(batches.map((batch) => batch.windowStart.toISOString())).toEqual([
      '2026-09-18T10:00:00.000Z',
      '2026-09-18T10:30:00.000Z',
    ]);
  });

  it('never mixes two users in one batch', () => {
    const batches = groupNotificationsIntoDigestBatches({
      items: [buildItem({ userId: 'user-1' }), buildItem({ userId: 'user-2' })],
      windowMs: WINDOW_MS,
    });

    expect(batches).toHaveLength(2);
    expect(batches.map((batch) => batch.userId)).toEqual(['user-1', 'user-2']);
  });

  it('returns batches ordered by window then user', () => {
    const batches = groupNotificationsIntoDigestBatches({
      items: [
        buildItem({
          userId: 'user-2',
          createdAt: new Date('2026-09-18T10:40:00.000Z'),
        }),
        buildItem({
          userId: 'user-1',
          createdAt: new Date('2026-09-18T10:00:00.000Z'),
        }),
        buildItem({
          userId: 'user-2',
          createdAt: new Date('2026-09-18T10:00:00.000Z'),
        }),
      ],
      windowMs: WINDOW_MS,
    });

    expect(
      batches.map(
        (batch) => `${batch.windowStart.toISOString()}:${batch.userId}`,
      ),
    ).toEqual([
      '2026-09-18T10:00:00.000Z:user-1',
      '2026-09-18T10:00:00.000Z:user-2',
      '2026-09-18T10:30:00.000Z:user-2',
    ]);
  });

  it('returns no batch for no items', () => {
    expect(
      groupNotificationsIntoDigestBatches({ items: [], windowMs: WINDOW_MS }),
    ).toEqual([]);
  });
});
