import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { type InboxNotificationPayload } from '@/inbox/types/InboxNotification';

export type CalendarReminderNotificationValues = {
  calendarEventId: string | null;
  title: string | null;
  startsAt: string | null;
  reminderMinutes: number | null;
};

// The CALENDAR_REMINDER payload is a producer snapshot, so a deleted event or an
// older producer only removes keys — every field is read defensively and a
// missing one degrades to null instead of throwing.
export const parseCalendarReminderNotificationPayload = (
  payload: InboxNotificationPayload,
): CalendarReminderNotificationValues => {
  if (payload === null) {
    return {
      calendarEventId: null,
      title: null,
      startsAt: null,
      reminderMinutes: null,
    };
  }

  const reminderMinutes = payload.reminderMinutes;

  return {
    calendarEventId: isNonEmptyString(payload.calendarEventId)
      ? payload.calendarEventId
      : null,
    title: isNonEmptyString(payload.title) ? payload.title : null,
    startsAt: isNonEmptyString(payload.startsAt) ? payload.startsAt : null,
    reminderMinutes:
      isDefined(reminderMinutes) &&
      typeof reminderMinutes === 'number' &&
      Number.isFinite(reminderMinutes) &&
      reminderMinutes >= 0
        ? reminderMinutes
        : null,
  };
};
