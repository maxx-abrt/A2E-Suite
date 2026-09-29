import { CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MINUTES } from 'src/engine/core-modules/calendar/constants/calendar-reminder-late-delivery-grace.constant';
import {
  buildCalendarReminderNotificationPayload,
  computeCalendarReminderSchedule,
  getCalendarReminderCandidateStartsAfter,
  shouldRearmCalendarReminder,
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
    // Reminder 15 min before an event that starts in 10 min → fired 5 min ago
    const event = makeEvent({
      startsAt: new Date(Date.now() + 10 * 60_000).toISOString(),
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
    const startsAt = new Date(Date.now() + 5 * 60_000); // in 5 min
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

// "At time of event" is reminderMinutes = 0 in the /calendar composer; the
// once-a-minute dispatch pass can only observe it after the event started.
describe('computeCalendarReminderSchedule — start-time and late-delivery rules', () => {
  const STARTS_AT = '2026-10-05T09:00:00.000Z';
  const startsAtMs = Date.parse(STARTS_AT);
  const at = (offsetMs: number) => new Date(startsAtMs + offsetMs);
  const SECOND = 1_000;
  const MINUTE = 60 * SECOND;

  const schedule = (reminderMinutes: number | null, now: Date) =>
    computeCalendarReminderSchedule(
      makeEvent({ startsAt: STARTS_AT, reminderMinutes }),
      now,
      QUIET_HOURS_OFF,
    );

  it('delivers an "At time of event" reminder at the start instant', () => {
    const result = schedule(0, at(0));

    expect(result).toEqual({ due: true, scheduledFor: new Date(STARTS_AT) });
  });

  it('delivers an "At time of event" reminder seen by the next minute pass', () => {
    expect(schedule(0, at(59 * SECOND)).due).toBe(true);
    expect(schedule(0, at(4 * MINUTE + 59 * SECOND)).due).toBe(true);
  });

  it('does not deliver an "At time of event" reminder before the start', () => {
    expect(schedule(0, at(-1 * SECOND))).toEqual({
      due: false,
      reason: 'NOT_YET_DUE',
    });
  });

  it('drops an "At time of event" reminder once the grace has passed', () => {
    expect(
      schedule(0, at(CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MINUTES * MINUTE)),
    ).toEqual({ due: false, reason: 'EVENT_ALREADY_STARTED' });
  });

  it('never delivers a long-lead reminder after the event started', () => {
    expect(schedule(15, at(-1 * SECOND)).due).toBe(true);
    expect(schedule(15, at(0))).toEqual({
      due: false,
      reason: 'EVENT_ALREADY_STARTED',
    });
    expect(schedule(1440, at(30 * SECOND))).toEqual({
      due: false,
      reason: 'EVENT_ALREADY_STARTED',
    });
  });

  it('gives a short lead the rest of the grace after its fire time', () => {
    // 2-minute lead fires at 08:58; deliverable until 08:58 + grace = 09:03.
    expect(schedule(2, at(2 * MINUTE + 59 * SECOND)).due).toBe(true);
    expect(schedule(2, at(3 * MINUTE))).toEqual({
      due: false,
      reason: 'EVENT_ALREADY_STARTED',
    });
  });

  it('treats a negative lead time as no reminder', () => {
    expect(schedule(-5, at(-10 * MINUTE))).toEqual({
      due: false,
      reason: 'NO_REMINDER_MINUTES',
    });
  });

  it('bounds the candidate query so every deliverable event is selected', () => {
    const now = at(4 * MINUTE + 59 * SECOND);
    const startsAfter = getCalendarReminderCandidateStartsAfter(now);

    expect(startsAfter.getTime()).toBe(
      now.getTime() - CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MINUTES * MINUTE,
    );
    // The last deliverable pass for a 0-minute reminder still selects it...
    expect(startsAtMs).toBeGreaterThan(startsAfter.getTime());
    // ...and once the grace passed the event is no longer a candidate.
    expect(startsAtMs).toBeLessThanOrEqual(
      getCalendarReminderCandidateStartsAfter(
        at(CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MINUTES * MINUTE),
      ).getTime(),
    );
  });
});

describe('buildCalendarReminderNotificationPayload', () => {
  it('includes calendarEventId, title, startsAt and userId', () => {
    const event = makeEvent({
      id: 'evt-42',
      title: 'My Meeting',
      startsAt: '2026-10-01T09:00:00Z',
      reminderMinutes: 15,
    });

    const payload = buildCalendarReminderNotificationPayload(event, 'user-1');

    expect(payload.calendarEventId).toBe('evt-42');
    expect(payload.title).toBe('My Meeting');
    expect(payload.startsAt).toBe('2026-10-01T09:00:00Z');
    expect(payload.reminderMinutes).toBe(15);
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

describe('shouldRearmCalendarReminder', () => {
  const delivered = {
    startsAt: '2026-09-27T10:00:00.000Z',
    reminderMinutes: 15,
    reminderDeliveredAt: '2026-09-27T09:45:00.000Z',
  };

  it('re-arms a delivered reminder when the event moves', () => {
    expect(
      shouldRearmCalendarReminder(delivered, {
        ...delivered,
        startsAt: '2026-09-27T11:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('re-arms a delivered reminder when the lead time changes', () => {
    expect(
      shouldRearmCalendarReminder(delivered, {
        ...delivered,
        reminderMinutes: 30,
      }),
    ).toBe(true);
  });

  it('does not re-arm when the same instant is re-saved in another ISO form', () => {
    expect(
      shouldRearmCalendarReminder(delivered, {
        ...delivered,
        startsAt: '2026-09-27T10:00:00Z',
      }),
    ).toBe(false);
  });

  it('does not re-arm a reminder that was never delivered', () => {
    expect(
      shouldRearmCalendarReminder(
        { ...delivered, reminderDeliveredAt: null },
        {
          ...delivered,
          reminderDeliveredAt: null,
          startsAt: '2026-09-27T11:00:00.000Z',
        },
      ),
    ).toBe(false);
  });

  it('does not re-arm on the dispatch claim itself (only reminderDeliveredAt changes)', () => {
    expect(
      shouldRearmCalendarReminder(
        { ...delivered, reminderDeliveredAt: null },
        delivered,
      ),
    ).toBe(false);
  });

  it('does not re-arm on unrelated edits such as the title', () => {
    expect(shouldRearmCalendarReminder(delivered, { ...delivered })).toBe(
      false,
    );
  });

  it('re-arms when the start time is cleared or first set', () => {
    expect(
      shouldRearmCalendarReminder(delivered, { ...delivered, startsAt: null }),
    ).toBe(true);
    expect(
      shouldRearmCalendarReminder({ ...delivered, startsAt: null }, delivered),
    ).toBe(true);
  });
});
