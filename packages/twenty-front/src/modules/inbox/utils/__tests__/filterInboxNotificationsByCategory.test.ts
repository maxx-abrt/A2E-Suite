import {
  filterInboxNotificationsByCategory,
  getInboxCategoryTypes,
} from '@/inbox/utils/filterInboxNotificationsByCategory';
import { type InboxNotification } from '@/inbox/types/InboxNotification';

const buildNotification = (
  overrides: Partial<InboxNotification> &
    Pick<InboxNotification, 'id' | 'type'>,
): InboxNotification => ({
  payload: null,
  createdAt: '2026-09-18T09:00:00.000Z',
  readAt: null,
  archivedAt: null,
  ...overrides,
});

const notifications = [
  buildNotification({ id: 'mention', type: 'MENTION' }),
  buildNotification({ id: 'assigned', type: 'ASSIGNED' }),
  buildNotification({ id: 'watched', type: 'WATCHED_RECORD_CHANGED' }),
  buildNotification({ id: 'system', type: 'SYSTEM' }),
];

describe('filterInboxNotificationsByCategory', () => {
  it('returns every notification for the all category', () => {
    expect(
      filterInboxNotificationsByCategory({ notifications, category: 'all' }),
    ).toHaveLength(4);
  });

  it('keeps only mentions', () => {
    expect(
      filterInboxNotificationsByCategory({
        notifications,
        category: 'mentions',
      }).map((notification) => notification.id),
    ).toEqual(['mention']);
  });

  it('keeps only assignments', () => {
    expect(
      filterInboxNotificationsByCategory({
        notifications,
        category: 'assigned',
      }).map((notification) => notification.id),
    ).toEqual(['assigned']);
  });

  it('keeps only watched-record changes', () => {
    expect(
      filterInboxNotificationsByCategory({
        notifications,
        category: 'watching',
      }).map((notification) => notification.id),
    ).toEqual(['watched']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(
      filterInboxNotificationsByCategory({
        notifications: [buildNotification({ id: 'system', type: 'SYSTEM' })],
        category: 'mentions',
      }),
    ).toEqual([]);
  });

  it('exposes no type filter for all', () => {
    expect(getInboxCategoryTypes('all')).toBeNull();
  });
});
