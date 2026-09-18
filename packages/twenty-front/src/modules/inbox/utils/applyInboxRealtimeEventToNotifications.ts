import { type InboxNotification } from '@/inbox/types/InboxNotification';
import { type InboxRealtimeEvent } from '@/inbox/types/InboxRealtimeEvent';

// Folds one inbox realtime event into the loaded list. Insert-by-id keeps the
// list idempotent: the page query, the reconnect catch-up and the dispatch
// fan-out can all deliver the same row and must not duplicate it (chat reducer
// precedent). An archived row leaves the default inbox view.
export const applyInboxRealtimeEventToNotifications = ({
  notifications,
  event,
}: {
  notifications: InboxNotification[];
  event: InboxRealtimeEvent;
}): InboxNotification[] => {
  const incomingById = new Map(
    event.notifications.map((notification) => [notification.id, notification]),
  );

  const withoutIncoming = notifications.filter(
    (notification) => !incomingById.has(notification.id),
  );

  for (const incoming of incomingById.values()) {
    if (incoming.archivedAt === null) {
      withoutIncoming.push(incoming);
    }
  }

  return withoutIncoming.sort(
    (firstNotification, secondNotification) =>
      secondNotification.createdAt.localeCompare(firstNotification.createdAt) ||
      secondNotification.id.localeCompare(firstNotification.id),
  );
};

export const getUnreadCountFromInboxRealtimeEvent = (
  event: InboxRealtimeEvent,
): number => event.unreadCount;
