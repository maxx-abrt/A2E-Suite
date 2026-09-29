import { isDefined } from 'twenty-shared/utils';

import { CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MINUTES } from 'src/engine/core-modules/calendar/constants/calendar-reminder-late-delivery-grace.constant';
import { type NotificationQuietHours } from 'src/engine/core-modules/notification/types/notification-preferences.type';
import { isWithinQuietHours } from 'src/engine/core-modules/notification/utils/is-within-quiet-hours.util';

export type CalendarReminderEvent = {
  id: string;
  title: string | null;
  startsAt: string | null;
  isCanceled: boolean;
  reminderMinutes: number | null;
  reminderDeliveredAt: string | null;
  // recurrenceTimezone is the D05 source-of-truth timezone for the event.
  // When null the dispatch service falls back to UTC (D05 documented default).
  recurrenceTimezone: string | null;
};

export type CalendarReminderDueResult =
  | { due: true; scheduledFor: Date }
  | { due: false; reason: CalendarReminderSkipReason };

export type CalendarReminderSkipReason =
  | 'NO_REMINDER_MINUTES'
  | 'ALREADY_DELIVERED'
  | 'CANCELLED'
  | 'NO_START_TIME'
  | 'NOT_YET_DUE'
  | 'EVENT_ALREADY_STARTED'
  | 'WITHIN_QUIET_HOURS';

const MS_PER_MINUTE = 60_000;

const CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MS =
  CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MINUTES * MS_PER_MINUTE;

// The last instant (exclusive) at which a reminder may still be delivered: the
// event start, or — for a lead time shorter than the grace, e.g. "At time of
// event" (0 minutes) — its fire time plus the grace. A late reminder for an
// event that is well under way (e.g. after worker downtime) is noise.
export const getCalendarReminderDeliveryDeadline = ({
  startsAtMs,
  scheduledForMs,
}: {
  startsAtMs: number;
  scheduledForMs: number;
}): number =>
  Math.max(startsAtMs, scheduledForMs + CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MS);

// The dispatch candidate query's lower bound on startsAt: any event starting
// after this instant may still have a deliverable reminder (the loosest
// deadline is startsAt + grace, for a 0-minute lead). The pure scheduler below
// applies the exact per-event deadline.
export const getCalendarReminderCandidateStartsAfter = (now: Date): Date =>
  new Date(now.getTime() - CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MS);

// Returns the instant at which the reminder fires when it is due now
// (scheduledFor ≤ now < delivery deadline), or a skip reason.
//
// Timezone: startsAt is an absolute instant and reminderMinutes a duration, so
// the fire time needs no zone. Quiet hours are evaluated in the recipient's
// P8 preference offset (utcOffsetMinutes). Attendee/event-zone policy is D05.
export const computeCalendarReminderSchedule = (
  event: CalendarReminderEvent,
  now: Date,
  quietHours: NotificationQuietHours,
): CalendarReminderDueResult => {
  if (event.isCanceled) {
    return { due: false, reason: 'CANCELLED' };
  }

  // 0 is a real preset ("At time of event"); only a missing or negative lead
  // time means "no reminder".
  if (event.reminderMinutes === null || event.reminderMinutes < 0) {
    return { due: false, reason: 'NO_REMINDER_MINUTES' };
  }

  if (event.reminderDeliveredAt !== null) {
    return { due: false, reason: 'ALREADY_DELIVERED' };
  }

  if (event.startsAt === null) {
    return { due: false, reason: 'NO_START_TIME' };
  }

  const startsAtMs = Date.parse(event.startsAt);

  if (isNaN(startsAtMs)) {
    return { due: false, reason: 'NO_START_TIME' };
  }

  const scheduledForMs = startsAtMs - event.reminderMinutes * MS_PER_MINUTE;
  const scheduledFor = new Date(scheduledForMs);

  if (scheduledForMs > now.getTime()) {
    return { due: false, reason: 'NOT_YET_DUE' };
  }

  if (
    now.getTime() >=
    getCalendarReminderDeliveryDeadline({ startsAtMs, scheduledForMs })
  ) {
    return { due: false, reason: 'EVENT_ALREADY_STARTED' };
  }

  // Quiet-hours check at the fire time. Uses the P8 user quiet-hours
  // preference (utcOffsetMinutes) rather than the event timezone because the
  // preference already encodes the recipient's local offset (D05 default).
  if (isWithinQuietHours({ date: scheduledFor, quietHours })) {
    return { due: false, reason: 'WITHIN_QUIET_HOURS' };
  }

  return { due: true, scheduledFor };
};

// Idempotency key: an event id + userId pair identifies one reminder delivery
// contract. If reminderDeliveredAt is already set the dispatch is a no-op.
export const buildCalendarReminderNotificationPayload = (
  event: CalendarReminderEvent,
  userId: string,
): Record<string, unknown> => ({
  calendarEventId: event.id,
  title: event.title ?? '',
  startsAt: event.startsAt ?? '',
  // The lead time the reminder was scheduled with, so the inbox can render
  // "15 min before" without re-reading the event.
  reminderMinutes: event.reminderMinutes,
  userId,
  // Include the timezone for the notification template (D05: display only,
  // not used for delivery gating).
  timezone: event.recurrenceTimezone ?? 'UTC',
});

// The fields of a calendarEvent row that decide when its reminder fires.
export type CalendarReminderScheduleFields = {
  startsAt?: string | null;
  reminderMinutes?: number | null;
  reminderDeliveredAt?: string | null;
};

const isSameInstant = (
  left: string | null | undefined,
  right: string | null | undefined,
): boolean => {
  if ((left ?? null) === (right ?? null)) {
    return true;
  }

  if (!isDefined(left) || !isDefined(right)) {
    return false;
  }

  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);

  return !isNaN(leftMs) && !isNaN(rightMs) && leftMs === rightMs;
};

// Reschedule contract (P4C.4): reminderDeliveredAt is the idempotency marker
// for ONE schedule. Once the event moves (startsAt) or its lead time changes
// (reminderMinutes), a delivered marker belongs to the old schedule and must
// be cleared so the next dispatch pass reminds for the new one. Re-saving the
// same instant (e.g. `…00Z` vs `…00.000Z`) is not a reschedule, and an update
// that only touches reminderDeliveredAt (the dispatch claim itself) never
// re-arms, so the listener cannot loop on its own writes.
export const shouldRearmCalendarReminder = (
  before: CalendarReminderScheduleFields,
  after: CalendarReminderScheduleFields,
): boolean => {
  if (!isDefined(after.reminderDeliveredAt)) {
    return false;
  }

  const hasStartMoved = !isSameInstant(before.startsAt, after.startsAt);
  const hasLeadTimeChanged =
    (before.reminderMinutes ?? null) !== (after.reminderMinutes ?? null);

  return hasStartMoved || hasLeadTimeChanged;
};
