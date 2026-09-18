import { type NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';

// Realtime payload fanned out on `workspace:<id>:inbox:<userId>`. One event
// type carries both the freshly created notifications and the user's unread
// count, and the count is always recomputed from the durable notification rows
// (NotificationService.countUnread) rather than tracked separately, so the
// badge and the inbox list can never disagree.
export const NOTIFICATION_INBOX_UPDATED_EVENT_TYPE =
  'notification.inbox.updated';

export type NotificationRealtimeEntry = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
};

export type NotificationInboxRealtimeEvent = {
  type: typeof NOTIFICATION_INBOX_UPDATED_EVENT_TYPE;
  workspaceId: string;
  userId: string;
  occurredAt: string;
  unreadCount: number;
  notifications: NotificationRealtimeEntry[];
};

export const toNotificationRealtimeEntry = (
  notification: NotificationEntity,
): NotificationRealtimeEntry => ({
  id: notification.id,
  type: notification.type,
  payload: notification.payload,
  createdAt: notification.createdAt.toISOString(),
  readAt: notification.readAt?.toISOString() ?? null,
  archivedAt: notification.archivedAt?.toISOString() ?? null,
});

export const buildNotificationInboxRealtimeEvent = ({
  workspaceId,
  userId,
  unreadCount,
  notifications,
  occurredAt,
}: {
  workspaceId: string;
  userId: string;
  unreadCount: number;
  notifications: NotificationRealtimeEntry[];
  occurredAt: string;
}): NotificationInboxRealtimeEvent => ({
  type: NOTIFICATION_INBOX_UPDATED_EVENT_TYPE,
  workspaceId,
  userId,
  occurredAt,
  unreadCount,
  notifications,
});
