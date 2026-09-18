import { type InboxNotification } from '@/inbox/types/InboxNotification';
import { type InboxRealtimeEvent } from '@/inbox/types/InboxRealtimeEvent';
import {
  applyInboxRealtimeEventToNotifications,
  getUnreadCountFromInboxRealtimeEvent,
} from '@/inbox/utils/applyInboxRealtimeEventToNotifications';

const buildNotification = (
  overrides: Partial<InboxNotification> & Pick<InboxNotification, 'id'>,
): InboxNotification => ({
  type: 'MENTION',
  payload: null,
  createdAt: '2026-09-18T09:00:00.000Z',
  readAt: null,
  archivedAt: null,
  ...overrides,
});

const buildEvent = (
  notifications: InboxNotification[],
  unreadCount = notifications.length,
): InboxRealtimeEvent => ({
  type: 'notification.inbox.updated',
  workspaceId: 'workspace-1',
  userId: 'user-1',
  occurredAt: '2026-09-18T09:00:00.000Z',
  unreadCount,
  notifications,
});

describe('applyInboxRealtimeEventToNotifications', () => {
  it('inserts a new notification and sorts newest first', () => {
    const notifications = applyInboxRealtimeEventToNotifications({
      notifications: [
        buildNotification({
          id: 'existing',
          createdAt: '2026-09-18T08:00:00.000Z',
        }),
      ],
      event: buildEvent([
        buildNotification({
          id: 'incoming',
          createdAt: '2026-09-18T10:00:00.000Z',
        }),
      ]),
    });

    expect(notifications.map((notification) => notification.id)).toEqual([
      'incoming',
      'existing',
    ]);
  });

  it('is idempotent when the same row is delivered twice', () => {
    const notification = buildNotification({ id: 'incoming' });

    const notifications = applyInboxRealtimeEventToNotifications({
      notifications: [notification],
      event: buildEvent([notification]),
    });

    expect(notifications).toHaveLength(1);
  });

  it('replaces an existing row with the incoming version', () => {
    const notifications = applyInboxRealtimeEventToNotifications({
      notifications: [buildNotification({ id: 'incoming', readAt: null })],
      event: buildEvent([
        buildNotification({
          id: 'incoming',
          readAt: '2026-09-18T10:00:00.000Z',
        }),
      ]),
    });

    expect(notifications[0].readAt).toBe('2026-09-18T10:00:00.000Z');
  });

  it('drops an incoming archived row from the default view', () => {
    const notifications = applyInboxRealtimeEventToNotifications({
      notifications: [],
      event: buildEvent([
        buildNotification({
          id: 'archived',
          archivedAt: '2026-09-18T10:00:00.000Z',
        }),
      ]),
    });

    expect(notifications).toEqual([]);
  });

  it('exposes the recomputed unread count from the event', () => {
    expect(getUnreadCountFromInboxRealtimeEvent(buildEvent([], 4))).toBe(4);
  });
});
