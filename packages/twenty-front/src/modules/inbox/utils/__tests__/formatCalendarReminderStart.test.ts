import { formatCalendarReminderStart } from '@/inbox/utils/formatCalendarReminderStart';

describe('formatCalendarReminderStart', () => {
  it('formats an ISO instant', () => {
    expect(
      formatCalendarReminderStart('2026-10-01T09:00:00.000Z'),
    ).not.toBeNull();
  });

  it('returns null for a missing value', () => {
    expect(formatCalendarReminderStart(null)).toBeNull();
    expect(formatCalendarReminderStart(undefined)).toBeNull();
    expect(formatCalendarReminderStart('')).toBeNull();
  });

  it('returns null for a non-date so the row never renders "Invalid Date"', () => {
    expect(formatCalendarReminderStart('not-a-date')).toBeNull();
    expect(formatCalendarReminderStart(42)).toBeNull();
  });
});
