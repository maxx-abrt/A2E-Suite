import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import { buildCalendarOccurrenceId } from '@/calendar/utils/buildCalendarOccurrenceId';
import { buildCalendarSeriesId } from '@/calendar/utils/buildCalendarSeriesId';
import { expandCalendarRecurrence } from '@/calendar/utils/expandCalendarRecurrence';

const buildRule = (
  overrides: Partial<CalendarRecurrenceRule>,
): CalendarRecurrenceRule => ({
  frequency: 'daily',
  interval: 1,
  byWeekdays: [],
  monthlyPosition: null,
  count: null,
  until: null,
  ...overrides,
});

describe('buildCalendarSeriesId', () => {
  it('derives a stable, namespaced id from the anchor event id', () => {
    expect(buildCalendarSeriesId({ seriesAnchorEventId: 'event-123' })).toBe(
      'calendar-series#event-123',
    );
  });

  it('gives distinct series ids for distinct anchors', () => {
    expect(
      buildCalendarSeriesId({ seriesAnchorEventId: 'event-123' }),
    ).not.toBe(buildCalendarSeriesId({ seriesAnchorEventId: 'event-456' }));
  });

  it('does not collide with a plain event id', () => {
    expect(
      buildCalendarSeriesId({ seriesAnchorEventId: 'calendar-series#x' }),
    ).not.toBe('calendar-series#x');
  });
});

describe('buildCalendarOccurrenceId', () => {
  it('derives the same id for the same series and day', () => {
    const first = buildCalendarOccurrenceId({
      seriesId: 'calendar-series#anchor',
      occurrenceDay: '2026-07-15',
    });
    const second = buildCalendarOccurrenceId({
      seriesId: 'calendar-series#anchor',
      occurrenceDay: '2026-07-15',
    });

    expect(first).toBe(second);
  });

  it('separates occurrences of the same series by day', () => {
    const first = buildCalendarOccurrenceId({
      seriesId: 'calendar-series#anchor',
      occurrenceDay: '2026-07-15',
    });
    const second = buildCalendarOccurrenceId({
      seriesId: 'calendar-series#anchor',
      occurrenceDay: '2026-07-16',
    });

    expect(first).not.toBe(second);
  });

  it('separates the same day across different series', () => {
    const first = buildCalendarOccurrenceId({
      seriesId: 'calendar-series#anchor-a',
      occurrenceDay: '2026-07-15',
    });
    const second = buildCalendarOccurrenceId({
      seriesId: 'calendar-series#anchor-b',
      occurrenceDay: '2026-07-15',
    });

    expect(first).not.toBe(second);
  });
});

describe('occurrence identity across DST', () => {
  const seriesId = buildCalendarSeriesId({ seriesAnchorEventId: 'anchor' });
  const rule = buildRule({ frequency: 'daily' });
  // Daily 09:00 in New York spanning the 2026-03-08 spring-forward.
  const seriesStart = '2026-03-07T14:00:00Z';

  it('keeps the occurrence identity on the wall-clock day through a DST shift', () => {
    const occurrences = expandCalendarRecurrence({
      rule,
      seriesStart,
      rangeStart: '2026-03-06T00:00:00Z',
      rangeEnd: '2026-03-11T00:00:00Z',
      timeZone: 'America/New_York',
    });

    // 2026-03-08 is the DST day: 09:00 EST (-05:00) before it, 09:00 EDT
    // (-04:00) from it on, so the instants shift while the day does not.
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      '2026-03-07T14:00:00Z',
      '2026-03-08T13:00:00Z',
      '2026-03-09T13:00:00Z',
      '2026-03-10T13:00:00Z',
    ]);

    expect(
      buildCalendarOccurrenceId({
        seriesId,
        occurrenceDay: occurrences[1].day,
      }),
    ).toBe(
      buildCalendarOccurrenceId({
        seriesId,
        occurrenceDay: '2026-03-08',
      }),
    );
  });

  it('derives the same identity regardless of the zone the series is expanded in', () => {
    const newYorkOccurrences = expandCalendarRecurrence({
      rule,
      seriesStart,
      rangeStart: '2026-03-06T00:00:00Z',
      rangeEnd: '2026-03-11T00:00:00Z',
      timeZone: 'America/New_York',
    });
    const utcOccurrences = expandCalendarRecurrence({
      rule,
      seriesStart: '2026-03-07T09:00:00Z',
      rangeStart: '2026-03-06T00:00:00Z',
      rangeEnd: '2026-03-11T00:00:00Z',
      timeZone: 'UTC',
    });

    expect(newYorkOccurrences.map((occurrence) => occurrence.day)).toEqual(
      utcOccurrences.map((occurrence) => occurrence.day),
    );
    expect(
      buildCalendarOccurrenceId({
        seriesId,
        occurrenceDay: newYorkOccurrences[1].day,
      }),
    ).toBe(
      buildCalendarOccurrenceId({
        seriesId,
        occurrenceDay: utcOccurrences[1].day,
      }),
    );
  });
});

describe('occurrence identity at month end', () => {
  it('keys the clipped month-end occurrence on the clipped day', () => {
    const seriesId = buildCalendarSeriesId({ seriesAnchorEventId: 'anchor' });
    const occurrences = expandCalendarRecurrence({
      rule: buildRule({ frequency: 'monthly' }),
      seriesStart: '2026-01-31T09:00:00Z',
      rangeStart: '2026-02-01T00:00:00Z',
      rangeEnd: '2026-03-01T00:00:00Z',
      timeZone: 'UTC',
    });

    expect(occurrences).toEqual([
      { day: '2026-02-28', startsAt: '2026-02-28T09:00:00Z' },
    ]);
    expect(
      buildCalendarOccurrenceId({
        seriesId,
        occurrenceDay: occurrences[0].day,
      }),
    ).toBe('calendar-series#anchor@2026-02-28');
  });

  it('keys a leap-day series occurrence on February 29', () => {
    const seriesId = buildCalendarSeriesId({ seriesAnchorEventId: 'anchor' });
    const occurrences = expandCalendarRecurrence({
      rule: buildRule({ frequency: 'monthly' }),
      seriesStart: '2028-01-31T09:00:00Z',
      rangeStart: '2028-02-01T00:00:00Z',
      rangeEnd: '2028-03-01T00:00:00Z',
      timeZone: 'UTC',
    });

    expect(occurrences[0].day).toBe('2028-02-29');
    expect(
      buildCalendarOccurrenceId({
        seriesId,
        occurrenceDay: occurrences[0].day,
      }),
    ).toBe('calendar-series#anchor@2028-02-29');
  });
});
