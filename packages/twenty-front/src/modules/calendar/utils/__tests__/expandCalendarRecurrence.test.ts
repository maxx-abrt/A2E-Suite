import { Temporal } from 'temporal-polyfill';

import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
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

const getLocalHours = (startsAtList: string[], timeZone: string): number[] =>
  startsAtList.map(
    (startsAt) =>
      Temporal.Instant.from(startsAt).toZonedDateTimeISO(timeZone).hour,
  );

describe('expandCalendarRecurrence — daily', () => {
  it('expands every day over the window', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({}),
        seriesStart: '2026-07-15T09:00:00Z',
        rangeStart: '2026-07-15T00:00:00Z',
        rangeEnd: '2026-07-18T00:00:00Z',
        timeZone: 'UTC',
      }),
    ).toEqual([
      { day: '2026-07-15', startsAt: '2026-07-15T09:00:00Z' },
      { day: '2026-07-16', startsAt: '2026-07-16T09:00:00Z' },
      { day: '2026-07-17', startsAt: '2026-07-17T09:00:00Z' },
    ]);
  });

  it('honours the interval', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ interval: 2 }),
        seriesStart: '2026-07-15T09:00:00Z',
        rangeStart: '2026-07-15T00:00:00Z',
        rangeEnd: '2026-07-21T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-07-15', '2026-07-17', '2026-07-19']);
  });

  it('returns nothing for a non-positive interval', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ interval: 0 }),
        seriesStart: '2026-07-15T09:00:00Z',
        rangeStart: '2026-07-15T00:00:00Z',
        rangeEnd: '2026-07-18T00:00:00Z',
        timeZone: 'UTC',
      }),
    ).toEqual([]);
  });

  it('returns nothing for an empty window', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({}),
        seriesStart: '2026-07-15T09:00:00Z',
        rangeStart: '2026-07-15T00:00:00Z',
        rangeEnd: '2026-07-15T00:00:00Z',
        timeZone: 'UTC',
      }),
    ).toEqual([]);
  });
});

describe('expandCalendarRecurrence — weekly', () => {
  it('expands every listed weekday, sorted, skipping days before the series start', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'weekly',
          byWeekdays: ['MO', 'WE'],
        }),
        // Wednesday 2026-01-07.
        seriesStart: '2026-01-07T10:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-02-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual([
      '2026-01-07',
      '2026-01-12',
      '2026-01-14',
      '2026-01-19',
      '2026-01-21',
      '2026-01-26',
      '2026-01-28',
    ]);
  });

  it('falls back to the series start weekday when no BYDAY is set', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'weekly' }),
        seriesStart: '2026-01-07T10:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-01-29T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-07', '2026-01-14', '2026-01-21', '2026-01-28']);
  });

  it('steps whole weeks with the interval', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'weekly',
          interval: 2,
          byWeekdays: ['MO', 'WE'],
        }),
        seriesStart: '2026-01-07T10:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-02-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-07', '2026-01-19', '2026-01-21']);
  });
});

describe('expandCalendarRecurrence — bounds', () => {
  it('stops after count occurrences from the series start', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ count: 3 }),
        seriesStart: '2026-07-15T09:00:00Z',
        rangeStart: '2026-07-15T00:00:00Z',
        rangeEnd: '2026-08-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-07-15', '2026-07-16', '2026-07-17']);
  });

  it('counts occurrences before the window toward the limit', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ count: 5 }),
        seriesStart: '2026-01-01T09:00:00Z',
        rangeStart: '2026-01-04T00:00:00Z',
        rangeEnd: '2026-01-10T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-04', '2026-01-05']);
  });

  it('treats until as an inclusive upper bound', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ until: '2026-01-03T09:00:00Z' }),
        seriesStart: '2026-01-01T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-01-10T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  it('treats the window as half-open at rangeEnd', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({}),
        seriesStart: '2026-01-01T09:00:00Z',
        rangeStart: '2026-01-02T09:00:00Z',
        rangeEnd: '2026-01-03T09:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-02']);
  });

  it('expands monthly rules to nothing until P4C.3b', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'monthly',
          monthlyPosition: { weekday: 'TU', ordinal: 2 },
        }),
        seriesStart: '2026-01-13T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-04-01T00:00:00Z',
        timeZone: 'UTC',
      }),
    ).toEqual([]);
  });
});

describe('expandCalendarRecurrence — DST and time zones', () => {
  it('keeps the wall-clock time across spring-forward while instants shift', () => {
    const occurrences = expandCalendarRecurrence({
      rule: buildRule({}),
      // 09:00 in New York (EST) on 2026-03-06.
      seriesStart: '2026-03-06T14:00:00Z',
      rangeStart: '2026-03-06T00:00:00Z',
      rangeEnd: '2026-03-10T00:00:00Z',
      timeZone: 'America/New_York',
    });

    expect(occurrences.map((occurrence) => occurrence.day)).toEqual([
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
    ]);
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      '2026-03-06T14:00:00Z',
      '2026-03-07T14:00:00Z',
      '2026-03-08T13:00:00Z',
      '2026-03-09T13:00:00Z',
    ]);
    expect(
      getLocalHours(
        occurrences.map((occurrence) => occurrence.startsAt),
        'America/New_York',
      ),
    ).toEqual([9, 9, 9, 9]);
  });

  it('keeps the wall-clock time across fall-back while instants shift', () => {
    const occurrences = expandCalendarRecurrence({
      rule: buildRule({}),
      // 09:00 in New York (EDT) on 2026-10-30.
      seriesStart: '2026-10-30T13:00:00Z',
      rangeStart: '2026-10-30T00:00:00Z',
      rangeEnd: '2026-11-03T00:00:00Z',
      timeZone: 'America/New_York',
    });

    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      '2026-10-30T13:00:00Z',
      '2026-10-31T13:00:00Z',
      '2026-11-01T14:00:00Z',
      '2026-11-02T14:00:00Z',
    ]);
    expect(
      getLocalHours(
        occurrences.map((occurrence) => occurrence.startsAt),
        'America/New_York',
      ),
    ).toEqual([9, 9, 9, 9]);
  });

  it('preserves the local wall-clock of the anchor zone when the zone changes', () => {
    const newYorkOccurrences = expandCalendarRecurrence({
      rule: buildRule({}),
      seriesStart: '2026-07-15T09:00:00Z',
      rangeStart: '2026-07-15T00:00:00Z',
      rangeEnd: '2026-07-18T00:00:00Z',
      timeZone: 'America/New_York',
    });
    const parisOccurrences = expandCalendarRecurrence({
      rule: buildRule({}),
      seriesStart: '2026-07-15T09:00:00Z',
      rangeStart: '2026-07-15T00:00:00Z',
      rangeEnd: '2026-07-18T00:00:00Z',
      timeZone: 'Europe/Paris',
    });

    expect(newYorkOccurrences.map((occurrence) => occurrence.day)).toEqual(
      parisOccurrences.map((occurrence) => occurrence.day),
    );
    expect(
      getLocalHours(
        newYorkOccurrences.map((occurrence) => occurrence.startsAt),
        'America/New_York',
      ),
    ).toEqual([5, 5, 5]);
    expect(
      getLocalHours(
        parisOccurrences.map((occurrence) => occurrence.startsAt),
        'Europe/Paris',
      ),
    ).toEqual([11, 11, 11]);
  });

  it('diverges in instants when one zone observes DST and the other does not', () => {
    const newYorkOccurrences = expandCalendarRecurrence({
      rule: buildRule({}),
      seriesStart: '2026-03-06T14:00:00Z',
      rangeStart: '2026-03-06T00:00:00Z',
      rangeEnd: '2026-03-10T00:00:00Z',
      timeZone: 'America/New_York',
    });
    const tokyoOccurrences = expandCalendarRecurrence({
      rule: buildRule({}),
      seriesStart: '2026-03-06T14:00:00Z',
      rangeStart: '2026-03-06T00:00:00Z',
      rangeEnd: '2026-03-10T00:00:00Z',
      timeZone: 'Asia/Tokyo',
    });

    expect(tokyoOccurrences.map((occurrence) => occurrence.day)).toEqual(
      newYorkOccurrences.map((occurrence) => occurrence.day),
    );
    expect(tokyoOccurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      '2026-03-06T14:00:00Z',
      '2026-03-07T14:00:00Z',
      '2026-03-08T14:00:00Z',
      '2026-03-09T14:00:00Z',
    ]);
    expect(
      getLocalHours(
        tokyoOccurrences.map((occurrence) => occurrence.startsAt),
        'Asia/Tokyo',
      ),
    ).toEqual([23, 23, 23, 23]);
  });
});

describe('expandCalendarRecurrence — long ranges', () => {
  it('crosses the leap day correctly', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({}),
        seriesStart: '2028-02-27T08:00:00Z',
        rangeStart: '2028-02-27T00:00:00Z',
        rangeEnd: '2028-03-02T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01']);
  });

  it('reaches a window far from the series start', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({}),
        seriesStart: '2026-01-01T09:00:00Z',
        rangeStart: '2027-12-30T00:00:00Z',
        rangeEnd: '2028-01-03T00:00:00Z',
        timeZone: 'UTC',
      }),
    ).toEqual([
      { day: '2027-12-30', startsAt: '2027-12-30T09:00:00Z' },
      { day: '2027-12-31', startsAt: '2027-12-31T09:00:00Z' },
      { day: '2028-01-01', startsAt: '2028-01-01T09:00:00Z' },
      { day: '2028-01-02', startsAt: '2028-01-02T09:00:00Z' },
    ]);
  });
});
