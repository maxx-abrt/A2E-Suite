import { isDefined } from 'twenty-shared/utils';

import { type InboxNotification } from '@/inbox/types/InboxNotification';

export type InboxNotificationDayGroup = {
  dayKey: string;
  notifications: InboxNotification[];
};

// Local calendar day, not UTC: a notification at 00:30 local must group with
// that local day, matching the wall clock the user reads the inbox with.
export const getInboxDayKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Groups the loaded inbox by local day, newest day first and newest
// notification first inside a day. The page query already sorts by createdAt
// DESC, but the realtime fold can append rows, so the group re-sorts by the
// same `(createdAt, id)` keyset.
export const groupInboxNotificationsByDay = (
  notifications: InboxNotification[],
): InboxNotificationDayGroup[] => {
  const notificationsByDayKey = new Map<string, InboxNotification[]>();

  for (const notification of notifications) {
    const dayKey = getInboxDayKey(new Date(notification.createdAt));
    const existing = notificationsByDayKey.get(dayKey);

    if (isDefined(existing)) {
      existing.push(notification);
    } else {
      notificationsByDayKey.set(dayKey, [notification]);
    }
  }

  return [...notificationsByDayKey.entries()]
    .map(([dayKey, dayNotifications]) => ({
      dayKey,
      notifications: [...dayNotifications].sort(
        (firstNotification, secondNotification) =>
          secondNotification.createdAt.localeCompare(
            firstNotification.createdAt,
          ) || secondNotification.id.localeCompare(firstNotification.id),
      ),
    }))
    .sort((firstGroup, secondGroup) =>
      secondGroup.dayKey.localeCompare(firstGroup.dayKey),
    );
};

export const getYesterdayDate = (now: Date): Date => {
  const yesterday = new Date(now);

  yesterday.setDate(yesterday.getDate() - 1);

  return yesterday;
};
