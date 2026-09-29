import { parseCalendarReminderNotificationPayload } from '@/inbox/utils/parseCalendarReminderNotificationPayload';

describe('parseCalendarReminderNotificationPayload', () => {
  it('maps the full producer payload', () => {
    expect(
      parseCalendarReminderNotificationPayload({
        calendarEventId: 'event-1',
        title: 'Weekly review',
        startsAt: '2026-10-01T09:00:00.000Z',
        reminderMinutes: 15,
      }),
    ).toEqual({
      calendarEventId: 'event-1',
      title: 'Weekly review',
      startsAt: '2026-10-01T09:00:00.000Z',
      reminderMinutes: 15,
    });
  });

  it('accepts "at the time of event" (0 minutes) as a real lead time', () => {
    expect(
      parseCalendarReminderNotificationPayload({ reminderMinutes: 0 })
        .reminderMinutes,
    ).toBe(0);
  });

  it('returns nulls for a missing payload without throwing', () => {
    expect(parseCalendarReminderNotificationPayload(null)).toEqual({
      calendarEventId: null,
      title: null,
      startsAt: null,
      reminderMinutes: null,
    });
  });

  it('degrades missing keys to null (deleted event / older producer)', () => {
    expect(
      parseCalendarReminderNotificationPayload({ userId: 'user-1' }),
    ).toEqual({
      calendarEventId: null,
      title: null,
      startsAt: null,
      reminderMinutes: null,
    });
  });

  it('ignores wrongly typed values instead of coercing them', () => {
    expect(
      parseCalendarReminderNotificationPayload({
        calendarEventId: 42,
        title: '',
        startsAt: null,
        reminderMinutes: 'soon',
      }),
    ).toEqual({
      calendarEventId: null,
      title: null,
      startsAt: null,
      reminderMinutes: null,
    });
  });

  it('drops a negative or non-finite lead time', () => {
    expect(
      parseCalendarReminderNotificationPayload({ reminderMinutes: -1 })
        .reminderMinutes,
    ).toBeNull();
    expect(
      parseCalendarReminderNotificationPayload({
        reminderMinutes: Number.NaN,
      }).reminderMinutes,
    ).toBeNull();
  });
});
