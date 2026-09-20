import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { getCalendarEventSpan } from '@/calendar/utils/getCalendarEventSpan';

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
  ...overrides,
});

describe('getCalendarEventSpan', () => {
  it('returns null without a start', () => {
    expect(
      getCalendarEventSpan(buildEvent({ startsAt: null }), 'UTC'),
    ).toBeNull();
  });

  it('returns null for an unparseable start', () => {
    expect(
      getCalendarEventSpan(buildEvent({ startsAt: 'not-a-date' }), 'UTC'),
    ).toBeNull();
  });

  it('treats a full-day event with an exclusive midnight end as one day', () => {
    const span = getCalendarEventSpan(
      buildEvent({
        isFullDay: true,
        startsAt: '2026-07-15T00:00:00.000Z',
        endsAt: '2026-07-16T00:00:00.000Z',
      }),
      'UTC',
    );

    expect(span?.isAllDay).toBe(true);
    expect(span?.startDay.toString()).toBe('2026-07-15');
    expect(span?.endDay.toString()).toBe('2026-07-15');
  });

  it('keeps a full-day event covering several days', () => {
    const span = getCalendarEventSpan(
      buildEvent({
        isFullDay: true,
        startsAt: '2026-07-15',
        endsAt: '2026-07-18',
      }),
      'UTC',
    );

    expect(span?.startDay.toString()).toBe('2026-07-15');
    expect(span?.endDay.toString()).toBe('2026-07-18');
  });

  it('spans a timed event across midnight', () => {
    const span = getCalendarEventSpan(
      buildEvent({
        startsAt: '2026-07-15T22:00:00.000Z',
        endsAt: '2026-07-16T02:00:00.000Z',
      }),
      'UTC',
    );

    expect(span?.isAllDay).toBe(false);
    expect(span?.startDay.toString()).toBe('2026-07-15');
    expect(span?.endDay.toString()).toBe('2026-07-16');
  });

  it('collapses a timed event ending exactly at midnight to the previous day', () => {
    const span = getCalendarEventSpan(
      buildEvent({
        startsAt: '2026-07-15T20:00:00.000Z',
        endsAt: '2026-07-16T00:00:00.000Z',
      }),
      'UTC',
    );

    expect(span?.endDay.toString()).toBe('2026-07-15');
  });

  it('uses the user time zone to place the event day', () => {
    const span = getCalendarEventSpan(
      buildEvent({ startsAt: '2026-07-15T23:30:00.000Z' }),
      'Europe/Paris',
    );

    expect(span?.startDay.toString()).toBe('2026-07-16');
  });
});
