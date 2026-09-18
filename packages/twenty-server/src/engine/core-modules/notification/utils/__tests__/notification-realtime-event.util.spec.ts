import { type NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import {
  NOTIFICATION_INBOX_UPDATED_EVENT_TYPE,
  buildNotificationInboxRealtimeEvent,
  toNotificationRealtimeEntry,
} from 'src/engine/core-modules/notification/utils/notification-realtime-event.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';

const buildNotification = (
  overrides: Partial<NotificationEntity> = {},
): NotificationEntity =>
  ({
    id: 'notification-1',
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    type: 'MENTION',
    payload: { snippet: 'hi' },
    createdAt: new Date('2026-09-18T10:00:00.000Z'),
    updatedAt: new Date('2026-09-18T10:00:00.000Z'),
    readAt: null,
    archivedAt: null,
    ...overrides,
  }) as NotificationEntity;

describe('toNotificationRealtimeEntry', () => {
  it('serializes an unread notification with ISO timestamps and null lifecycle', () => {
    expect(toNotificationRealtimeEntry(buildNotification())).toEqual({
      id: 'notification-1',
      type: 'MENTION',
      payload: { snippet: 'hi' },
      createdAt: '2026-09-18T10:00:00.000Z',
      readAt: null,
      archivedAt: null,
    });
  });

  it('serializes read and archived timestamps when present', () => {
    const entry = toNotificationRealtimeEntry(
      buildNotification({
        readAt: new Date('2026-09-18T11:00:00.000Z'),
        archivedAt: new Date('2026-09-18T12:00:00.000Z'),
      }),
    );

    expect(entry.readAt).toBe('2026-09-18T11:00:00.000Z');
    expect(entry.archivedAt).toBe('2026-09-18T12:00:00.000Z');
  });
});

describe('buildNotificationInboxRealtimeEvent', () => {
  it('shapes the inbox topic payload with the derived unread count', () => {
    expect(
      buildNotificationInboxRealtimeEvent({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        unreadCount: 3,
        notifications: [toNotificationRealtimeEntry(buildNotification())],
        occurredAt: '2026-09-18T10:00:01.000Z',
      }),
    ).toEqual({
      type: NOTIFICATION_INBOX_UPDATED_EVENT_TYPE,
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      occurredAt: '2026-09-18T10:00:01.000Z',
      unreadCount: 3,
      notifications: [
        {
          id: 'notification-1',
          type: 'MENTION',
          payload: { snippet: 'hi' },
          createdAt: '2026-09-18T10:00:00.000Z',
          readAt: null,
          archivedAt: null,
        },
      ],
    });
  });
});
