import { type NotificationType } from 'src/engine/core-modules/notification/constants/notification-type.constant';

export type NotificationDigestItem = {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type NotificationEmailDigestBatch = {
  userId: string;
  windowStart: Date;
  windowEnd: Date;
  items: NotificationDigestItem[];
};

// Windows are aligned to the epoch, not to the first item, so notifications
// arriving minutes apart from the same burst collapse into one batch while an
// empty window never delays the next one.
export const getNotificationDigestWindowStart = ({
  date,
  windowMs,
}: {
  date: Date;
  windowMs: number;
}): Date => new Date(Math.floor(date.getTime() / windowMs) * windowMs);

export const groupNotificationsIntoDigestBatches = ({
  items,
  windowMs,
}: {
  items: NotificationDigestItem[];
  windowMs: number;
}): NotificationEmailDigestBatch[] => {
  const batchesByKey = new Map<string, NotificationEmailDigestBatch>();

  for (const item of items) {
    const windowStart = getNotificationDigestWindowStart({
      date: item.createdAt,
      windowMs,
    });
    const key = `${item.userId}:${windowStart.getTime()}`;
    const existingBatch = batchesByKey.get(key);

    if (existingBatch) {
      existingBatch.items.push(item);
    } else {
      batchesByKey.set(key, {
        userId: item.userId,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + windowMs),
        items: [item],
      });
    }
  }

  // Deterministic order (oldest window first, then user) so a digest worker
  // processes batches predictably across runs.
  return [...batchesByKey.values()].sort(
    (leftBatch, rightBatch) =>
      leftBatch.windowStart.getTime() - rightBatch.windowStart.getTime() ||
      leftBatch.userId.localeCompare(rightBatch.userId),
  );
};
