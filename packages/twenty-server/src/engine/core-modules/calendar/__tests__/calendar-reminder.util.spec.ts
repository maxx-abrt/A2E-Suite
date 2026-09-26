import {
  buildCalendarReminderNotificationPayload,
  computeCalendarReminderSchedule,
  type CalendarReminderEvent,
} from 'src/engine/core-modules/calendar/utils/calendar-reminder.util';
import { type NotificationQuietHours } from 'src/engine/core-modules/notification/types/notification-preferences.type';

const QUIET_HOURS_OFF: NotificationQuietHours = {
  enabled: false,
  startMinuteOfDay: 22 * 60,
  endMinuteOfDay: 7 * 60,
  utcOffsetMinutes: 0,
};

const makeEvent = (
  overrides: Partial<CalendarReminderEvent> = {},
): CalendarReminderEvent => ({
  id: 'evt-1',
  title: 'Stand-up',
  startsAt: new Date(Date.now() + 30 * 60_000).toISOString(), // 30 min from now
  isCanceled: false,
  reminderMinutes: 15,
  reminderDeliveredAt: null,
  recurrenceTimezone: null,
  ...overrides,
});

describe('computeCalendarReminderSchedule', () => {
  it('returns due when scheduledFor ≤ now and quiet hours off', () => {
    // Reminder was 15 min before an event that starts 10 min ago → due
    const event = makeEvent({
      startsAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      reminderMinutes: 15,
    });
    const result = computeCalendarReminderSchedule(
      event,
      new Date(),
      QUIET_HOURS_OFF,
    );

    expect(result.due).toBe(true);
  });

  it('skips when reminderDeliveredAt is already set (idempotency)', () => {
    const event = makeEvent({
      reminderDeliveredAt: new Date().toISOString(),
    });
    const result = computeCalendarReminderSchedule(
      event,
      new Date(),
      QUIET_HOURS_OFF,
    );

    expect(result.due).toBe(false);
    if (!result.due) {
      expect(result.reason).toBe('ALREADY_DELIVERED');
    }
  });

  it('skips cancelled events', () => {
    const event = makeEvent({ isCanceled: true });
    const result = computeCalendarReminderSchedule(
      event,
      new Date(),
      QUIET_HOURS_OFF,
    );

    expect(result.due).toBe(false);
    if (!result.due) {
      expect(result.reason).toBe('CANCELLED');
    }
  });

  it('skips when reminderMinutes is null', () => {
    const event = makeEvent({ reminderMinutes: null });
    const result = computeCalendarReminderSchedule(
      event,
      new Date(),
      QUIET_HOURS_OFF,
    );

    expect(result.due).toBe(false);
    if (!result.due) {
      expect(result.reason).toBe('NO_REMINDER_MINUTES');
    }
  });

  it('skips when startsAt is null', () => {
    const event = makeEvent({ startsAt: null });
    const result = computeCalendarReminderSchedule(
      event,
      new Date(),
      QUIET_HOURS_OFF,
    );

    expect(result.due).toBe(false);
    if (!result.due) {
      expect(result.reason).toBe('NO_START_TIME');
    }
  });

  it('skips when event is not yet due (scheduledFor > now)', () => {
    const event = makeEvent({
      startsAt: new Date(Date.now() + 60 * 60_000).toISOString(), // 1h from now
      reminderMinutes: 15, // fire in 45 min → not yet due
    });
    const result = computeCalendarReminderSchedule(
      event,
      new Date(),
      QUIET_HOURS_OFF,
    );

    expect(result.due).toBe(false);
    if (!result.due) {
      expect(result.reason).toBe('NOT_YET_DUE');
    }
  });

  it('skips when the scheduled fire time falls within quiet hours', () => {
    // Fire time is at 02:00 UTC; quiet hours 00:00 → 07:00 UTC (utcOffset 0)
    const fireTime = new Date('2026-09-01T02:00:00Z');
    const startsAtMs =
      fireTime.getTime() + 15 * 60_000; // 15 min after the fire time

    const event = makeEvent({
      startsAt: new Date(startsAtMs).toISOString(),
      reminderMinutes: 15,
    });

    const quietHours: NotificationQuietHours = {
      enabled: true,
      startMinuteOfDay: 0, // 00:00
      endMinuteOfDay: 7 * 60, // 07:00
      utcOffsetMinutes: 0,
    };

    const result = computeCalendarReminderSchedule(
      event,
      fireTime,
      quietHours,
    );

    expect(result.due).toBe(false);
    if (!result.due) {
      expect(result.reason).toBe('WITHIN_QUIET_HOURS');
    }
  });

  it('includes the correct scheduledFor when due', () => {
    const startsAt = new Date(Date.now() - 5 * 60_000); // 5 min ago
    const reminderMinutes = 10;
    const expectedScheduledFor = new Date(
      startsAt.getTime() - reminderMinutes * 60_000,
    );
    const event = makeEvent({
      startsAt: startsAt.toISOString(),
      reminderMinutes,
    });

    const result = computeCalendarReminderSchedule(
      event,
      new Date(),
      QUIET_HOURS_OFF,
    );

    expect(result.due).toBe(true);
    if (result.due) {
      expect(result.scheduledFor.getTime()).toBeCloseTo(
        expectedScheduledFor.getTime(),
        -1,
      );
    }
  });
});

describe('buildCalendarReminderNotificationPayload', () => {
  it('includes calendarEventId, title, startsAt and userId', () => {
    const event = makeEvent({
      id: 'evt-42',
      title: 'My Meeting',
      startsAt: '2026-10-01T09:00:00Z',
    });

    const payload = buildCalendarReminderNotificationPayload(event, 'user-1');

    expect(payload.calendarEventId).toBe('evt-42');
    expect(payload.title).toBe('My Meeting');
    expect(payload.startsAt).toBe('2026-10-01T09:00:00Z');
    expect(payload.userId).toBe('user-1');
  });

  it('falls back to UTC when recurrenceTimezone is null (D05 default)', () => {
    const event = makeEvent({ recurrenceTimezone: null });
    const payload = buildCalendarReminderNotificationPayload(event, 'user-1');

    expect(payload.timezone).toBe('UTC');
  });

  it('uses recurrenceTimezone when present', () => {
    const event = makeEvent({ recurrenceTimezone: 'Europe/Paris' });
    const payload = buildCalendarReminderNotificationPayload(event, 'user-1');

    expect(payload.timezone).toBe('Europe/Paris');
  });
});
