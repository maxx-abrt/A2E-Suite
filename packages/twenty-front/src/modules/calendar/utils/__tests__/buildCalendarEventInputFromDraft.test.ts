import { Temporal } from 'temporal-polyfill';

import { type CalendarEventDraft } from '@/calendar/types/CalendarEventDraft';
import { buildCalendarEventInputFromDraft } from '@/calendar/utils/buildCalendarEventInputFromDraft';

const buildDraft = (
  overrides: Partial<CalendarEventDraft>,
): CalendarEventDraft => ({
  title: 'Standup',
  description: '',
  location: '',
  isFullDay: false,
  isCanceled: false,
  startDay: Temporal.PlainDate.from('2026-07-15'),
  startHour: 9,
  startMinute: 0,
  endDay: Temporal.PlainDate.from('2026-07-15'),
  endHour: 10,
  endMinute: 0,
  ...overrides,
});

describe('buildCalendarEventInputFromDraft', () => {
  it('converts a timed draft using the user time zone', () => {
    const input = buildCalendarEventInputFromDraft({
      draft: buildDraft({}),
      timeZone: 'America/New_York',
    });

    expect(input.startsAt).toBe('2026-07-15T13:00:00Z');
    expect(input.endsAt).toBe('2026-07-15T14:00:00Z');
    expect(input.isFullDay).toBe(false);
    expect(input.description).toBeNull();
    expect(input.location).toBeNull();
  });

  it('keeps a one-hour duration across the spring-forward gap', () => {
    const input = buildCalendarEventInputFromDraft({
      draft: buildDraft({
        startDay: Temporal.PlainDate.from('2026-03-08'),
        endDay: Temporal.PlainDate.from('2026-03-08'),
        startHour: 1,
        startMinute: 30,
        endHour: 3,
        endMinute: 30,
      }),
      timeZone: 'America/New_York',
    });

    expect(input.startsAt).toBe('2026-03-08T06:30:00Z');
    expect(input.endsAt).toBe('2026-03-08T07:30:00Z');
  });

  it('uses an exclusive next-midnight end for an all-day event', () => {
    const input = buildCalendarEventInputFromDraft({
      draft: buildDraft({ isFullDay: true }),
      timeZone: 'America/New_York',
    });

    expect(input.startsAt).toBe('2026-07-15T00:00:00Z');
    expect(input.endsAt).toBe('2026-07-16T00:00:00Z');
    expect(input.isFullDay).toBe(true);
  });

  it('extends a zero-length timed event to the minimum duration', () => {
    const input = buildCalendarEventInputFromDraft({
      draft: buildDraft({ endHour: 9, endMinute: 0 }),
      timeZone: 'UTC',
    });

    expect(input.startsAt).toBe('2026-07-15T09:00:00Z');
    expect(input.endsAt).toBe('2026-07-15T09:30:00Z');
  });

  it('normalizes blank text fields to null', () => {
    const input = buildCalendarEventInputFromDraft({
      draft: buildDraft({ title: '   ', description: '  ', location: 'Room' }),
      timeZone: 'UTC',
    });

    expect(input.title).toBeNull();
    expect(input.description).toBeNull();
    expect(input.location).toBe('Room');
  });
});
