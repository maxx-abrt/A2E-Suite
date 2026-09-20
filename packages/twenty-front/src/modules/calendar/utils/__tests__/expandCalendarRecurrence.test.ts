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
});

describe('expandCalendarRecurrence — monthly by date', () => {
  it('repeats on the series start day-of-month', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly' }),
        seriesStart: '2026-01-15T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-05-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
  });

  it('clips a 31st series to each short month end without drifting', () => {
    // Pinned decision: Jan 31 -> Feb 28 (not skipped), then back to Mar 31. The
    // day is re-derived from DTSTART every month, so the February clip never
    // shifts the rest of the series.
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly' }),
        seriesStart: '2026-01-31T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-08-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
      '2026-07-31',
    ]);
  });

  it('steps whole months with the interval, clipping each target month', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly', interval: 2 }),
        seriesStart: '2026-01-15T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-06-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-15', '2026-03-15', '2026-05-15']);
  });

  it('keeps the wall-clock time and zone of the series start', () => {
    const occurrences = expandCalendarRecurrence({
      rule: buildRule({ frequency: 'monthly' }),
      seriesStart: '2026-01-15T14:00:00Z',
      rangeStart: '2026-01-01T00:00:00Z',
      rangeEnd: '2026-04-01T00:00:00Z',
      timeZone: 'America/New_York',
    });

    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      '2026-01-15T14:00:00Z',
      '2026-02-15T14:00:00Z',
      '2026-03-15T13:00:00Z',
    ]);
    expect(
      getLocalHours(
        occurrences.map((occurrence) => occurrence.startsAt),
        'America/New_York',
      ),
    ).toEqual([9, 9, 9]);
  });
});

describe('expandCalendarRecurrence — monthly by position', () => {
  it('expands a positive ordinal to the nth weekday of each month', () => {
    // Jan 8 2026 is the second Thursday, so the series starts there.
    expect(
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'monthly',
          monthlyPosition: { weekday: 'TH', ordinal: 2 },
        }),
        seriesStart: '2026-01-08T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-04-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-08', '2026-02-12', '2026-03-12']);
  });

  it('expands -1 to the last occurrence of the weekday in each month', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'monthly',
          monthlyPosition: { weekday: 'FR', ordinal: -1 },
        }),
        seriesStart: '2026-01-30T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-04-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-30', '2026-02-27', '2026-03-27']);
  });

  it('skips a first month whose position falls before the series start', () => {
    // Series starts on the third Tuesday; the January first-Tuesday is before
    // DTSTART and must not be emitted.
    expect(
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'monthly',
          monthlyPosition: { weekday: 'TU', ordinal: 1 },
        }),
        seriesStart: '2026-01-20T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-03-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-02-03']);
  });

  it('expands every listed weekday of each month when no position is set', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'monthly',
          byWeekdays: ['WE', 'MO'],
        }),
        seriesStart: '2026-01-07T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-03-01T00:00:00Z',
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
      '2026-02-02',
      '2026-02-04',
      '2026-02-09',
      '2026-02-11',
      '2026-02-16',
      '2026-02-18',
      '2026-02-23',
      '2026-02-25',
    ]);
  });
});

describe('expandCalendarRecurrence — month-end and leap-year battery', () => {
  it('clips a 31st series across every short month in a year', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly' }),
        seriesStart: '2026-01-31T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2027-01-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
      '2026-07-31',
      '2026-08-31',
      '2026-09-30',
      '2026-10-31',
      '2026-11-30',
      '2026-12-31',
    ]);
  });

  it('clips a Feb 29 series to Feb 28 in non-leap years and returns to Feb 29 in leap years', () => {
    // Pinned decision: Feb 29 -> Feb 28 in non-leap years (not skipped, no
    // drift), and back to Feb 29 whenever the year is a leap year.
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly' }),
        seriesStart: '2028-02-29T09:00:00Z',
        rangeStart: '2028-02-01T00:00:00Z',
        rangeEnd: '2029-04-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual([
      '2028-02-29',
      '2028-03-29',
      '2028-04-29',
      '2028-05-29',
      '2028-06-29',
      '2028-07-29',
      '2028-08-29',
      '2028-09-29',
      '2028-10-29',
      '2028-11-29',
      '2028-12-29',
      '2029-01-29',
      '2029-02-28',
      '2029-03-29',
    ]);
  });

  it('expands a monthly interval that crosses Feb 29 in both leap and non-leap years', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly', interval: 12 }),
        seriesStart: '2028-02-29T09:00:00Z',
        rangeStart: '2028-01-01T00:00:00Z',
        rangeEnd: '2033-01-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
      '2031-02-28',
      '2032-02-29',
    ]);
  });
});

describe('expandCalendarRecurrence — monthly termination', () => {
  it('stops after count occurrences from the series start', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly', count: 3 }),
        seriesStart: '2026-01-31T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-12-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('counts occurrences before the window toward the limit', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly', count: 3 }),
        seriesStart: '2026-01-15T09:00:00Z',
        rangeStart: '2026-03-01T00:00:00Z',
        rangeEnd: '2027-01-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-03-15']);
  });

  it('treats until as an inclusive upper bound', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'monthly',
          until: '2026-03-15T09:00:00Z',
        }),
        seriesStart: '2026-01-15T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2027-01-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
  });

  it('returns nothing for a non-positive monthly interval', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly', interval: 0 }),
        seriesStart: '2026-01-15T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2027-01-01T00:00:00Z',
        timeZone: 'UTC',
      }),
    ).toEqual([]);
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly', interval: -1 }),
        seriesStart: '2026-01-15T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2027-01-01T00:00:00Z',
        timeZone: 'UTC',
      }),
    ).toEqual([]);
  });

  it('stops at count even for an unbounded window', () => {
    expect(
      expandCalendarRecurrence({
        rule: buildRule({ frequency: 'monthly', count: 4 }),
        seriesStart: '2026-01-15T09:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '9999-01-01T00:00:00Z',
        timeZone: 'UTC',
      }).map((occurrence) => occurrence.day),
    ).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
  });
});

describe('expandCalendarRecurrence — locale week start', () => {
  it('anchors weekly interval steps on the supplied locale week start', () => {
    const expandSundaySeries = (weekStartsOnDayIndex: number | null) =>
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'weekly',
          interval: 2,
          byWeekdays: ['SU'],
        }),
        seriesStart: '2026-01-07T10:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-03-01T00:00:00Z',
        timeZone: 'UTC',
        weekStartsOnDayIndex,
      }).map((occurrence) => occurrence.day);

    // Monday weeks: the first Sunday on/after DTSTART is Jan 11.
    expect(expandSundaySeries(null)).toEqual([
      '2026-01-11',
      '2026-01-25',
      '2026-02-08',
      '2026-02-22',
    ]);
    // Sunday weeks: Jan 4 is skipped (before DTSTART), so the series lands a week later.
    expect(expandSundaySeries(0)).toEqual([
      '2026-01-18',
      '2026-02-01',
      '2026-02-15',
    ]);
  });

  it('treats an explicit Monday as the default and normalizes invalid preferences', () => {
    const expandMondaySeries = (weekStartsOnDayIndex: number | null) =>
      expandCalendarRecurrence({
        rule: buildRule({
          frequency: 'weekly',
          interval: 2,
          byWeekdays: ['MO'],
        }),
        seriesStart: '2026-01-07T10:00:00Z',
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-02-15T00:00:00Z',
        timeZone: 'UTC',
        weekStartsOnDayIndex,
      }).map((occurrence) => occurrence.day);

    expect(expandMondaySeries(1)).toEqual(expandMondaySeries(null));
    expect(expandMondaySeries(42)).toEqual(expandMondaySeries(null));
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
