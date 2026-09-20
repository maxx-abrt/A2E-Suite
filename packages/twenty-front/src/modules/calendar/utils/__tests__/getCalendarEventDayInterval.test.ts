import { Temporal } from 'temporal-polyfill';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { getCalendarEventDayInterval } from '@/calendar/utils/getCalendarEventDayInterval';

const buildEvent = (
  overrides: Partial<CalendarEventRecord>,
): CalendarEventRecord => ({
  id: 'event-1',
  title: 'Event',
  description: null,
  location: null,
  startsAt: null,
  endsAt: null,
  isFullDay: false,
  isCanceled: false,
  externalCreatedAt: null,
  ...overrides,
});

const day = Temporal.PlainDate.from('2026-07-15');

describe('getCalendarEventDayInterval', () => {
  it('returns the minutes of a timed event in the user time zone', () => {
    const interval = getCalendarEventDayInterval({
      event: buildEvent({
        startsAt: '2026-07-15T13:00:00Z',
        endsAt: '2026-07-15T14:30:00Z',
      }),
      day,
      timeZone: 'America/New_York',
    });

    expect(interval).toEqual({ startMinutes: 540, endMinutes: 630 });
  });

  it('clips the start of an event that began the previous day', () => {
    const interval = getCalendarEventDayInterval({
      event: buildEvent({
        startsAt: '2026-07-14T22:00:00Z',
        endsAt: '2026-07-15T02:00:00Z',
      }),
      day,
      timeZone: 'UTC',
    });

    expect(interval).toEqual({ startMinutes: 0, endMinutes: 120 });
  });

  it('clips the end of an event that continues the next day', () => {
    const interval = getCalendarEventDayInterval({
      event: buildEvent({
        startsAt: '2026-07-15T22:00:00Z',
        endsAt: '2026-07-16T02:00:00Z',
      }),
      day,
      timeZone: 'UTC',
    });

    expect(interval).toEqual({ startMinutes: 1320, endMinutes: 1440 });
  });

  it('returns null for a day the event does not cover', () => {
    expect(
      getCalendarEventDayInterval({
        event: buildEvent({
          startsAt: '2026-07-14T13:00:00Z',
          endsAt: '2026-07-14T14:00:00Z',
        }),
        day,
        timeZone: 'UTC',
      }),
    ).toBeNull();
  });

  it('returns null for all-day and undated events', () => {
    expect(
      getCalendarEventDayInterval({
        event: buildEvent({ isFullDay: true, startsAt: '2026-07-15' }),
        day,
        timeZone: 'UTC',
      }),
    ).toBeNull();
    expect(
      getCalendarEventDayInterval({
        event: buildEvent({ startsAt: null }),
        day,
        timeZone: 'UTC',
      }),
    ).toBeNull();
  });

  it('defaults a missing end to the minimum duration', () => {
    const interval = getCalendarEventDayInterval({
      event: buildEvent({ startsAt: '2026-07-15T09:00:00Z' }),
      day,
      timeZone: 'UTC',
    });

    expect(interval).toEqual({ startMinutes: 540, endMinutes: 570 });
  });
});
