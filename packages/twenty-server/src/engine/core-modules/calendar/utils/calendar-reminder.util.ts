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
  | 'WITHIN_QUIET_HOURS';

// D05 default timezone: use the event's recurrenceTimezone when present; fall
// back to UTC when absent. Per D05 (open decision: attendee quiet-hours policy
// by timezone) we do NOT apply a per-attendee offset here — the host workspace
// member's P8 quiet-hours preference uses its own utcOffsetMinutes already.
const resolveEventTimezoneOffset = (
  recurrenceTimezone: string | null,
): number => {
  if (recurrenceTimezone === null) {
    return 0; // UTC fallback — D05 documented default
  }

  try {
    // Node/V8 does not expose a JS API for resolving an IANA offset at a
    // given instant; approximate with the current wall-clock offset so the
    // reminder fires at roughly the right local time without a heavy tz lib.
    const nowInZone = new Date().toLocaleString('en-US', {
      timeZone: recurrenceTimezone,
    });
    const nowUtc = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
    const offsetMs = Date.parse(nowInZone) - Date.parse(nowUtc);

    return Math.round(offsetMs / 60_000);
  } catch {
    return 0;
  }
};

// Returns the wall-clock instant at which the reminder should fire, or a skip
// reason. The caller is responsible for checking whether that instant has
// passed (scheduledFor ≤ now) before dispatching.
export const computeCalendarReminderSchedule = (
  event: CalendarReminderEvent,
  now: Date,
  quietHours: NotificationQuietHours,
): CalendarReminderDueResult => {
  if (event.isCanceled) {
    return { due: false, reason: 'CANCELLED' };
  }

  if (event.reminderMinutes === null || event.reminderMinutes <= 0) {
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

  const scheduledFor = new Date(
    startsAtMs - event.reminderMinutes * 60_000,
  );

  if (scheduledFor > now) {
    return { due: false, reason: 'NOT_YET_DUE' };
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
  userId,
  // Include the timezone for the notification template (D05: display only,
  // not used for delivery gating).
  timezone: event.recurrenceTimezone ?? 'UTC',
});
