import {
  type StoredCalendarEventRecurrenceRecord,
  expandStoredCalendarEventRecurrence,
} from 'src/modules/calendar/common/utils/expand-stored-calendar-event-recurrence.util';

const buildAnchorRecord = (
  overrides: Partial<StoredCalendarEventRecurrenceRecord> = {},
): StoredCalendarEventRecurrenceRecord => ({
  id: 'anchor-id',
  startsAt: '2026-01-05T09:00:00Z',
  recurrenceRule: 'FREQ=DAILY;COUNT=3',
  recurrenceTimezone: 'UTC',
  recurrenceSeriesId: 'calendar-series#anchor-id',
  recurrenceOccurrenceDay: null,
  recurrenceSkippedOccurrenceDays: null,
  ...overrides,
});

describe('expandStoredCalendarEventRecurrence', () => {
  it('expands a stored daily rule over the window', () => {
    const occurrences = expandStoredCalendarEventRecurrence({
      records: [buildAnchorRecord()],
      rangeStart: '2026-01-01T00:00:00Z',
      rangeEnd: '2026-01-10T00:00:00Z',
    });

    expect(occurrences).toEqual([
      { day: '2026-01-05', startsAt: '2026-01-05T09:00:00Z' },
      { day: '2026-01-06', startsAt: '2026-01-06T09:00:00Z' },
      { day: '2026-01-07', startsAt: '2026-01-07T09:00:00Z' },
    ]);
  });

  it('drops stored skipped occurrence days', () => {
    const occurrences = expandStoredCalendarEventRecurrence({
      records: [
        buildAnchorRecord({
          recurrenceSkippedOccurrenceDays: JSON.stringify(['2026-01-06']),
        }),
      ],
      rangeStart: '2026-01-01T00:00:00Z',
      rangeEnd: '2026-01-10T00:00:00Z',
    });

    expect(occurrences.map((occurrence) => occurrence.day)).toEqual([
      '2026-01-05',
      '2026-01-07',
    ]);
  });

  it('overrides an occurrence with its stored detached row', () => {
    const occurrences = expandStoredCalendarEventRecurrence({
      records: [
        buildAnchorRecord(),
        {
          id: 'detached-id',
          startsAt: '2026-01-06T14:30:00Z',
          recurrenceRule: null,
          recurrenceTimezone: null,
          recurrenceSeriesId: 'calendar-series#anchor-id',
          recurrenceOccurrenceDay: '2026-01-06',
          recurrenceSkippedOccurrenceDays: null,
        },
      ],
      rangeStart: '2026-01-01T00:00:00Z',
      rangeEnd: '2026-01-10T00:00:00Z',
    });

    expect(occurrences).toEqual([
      { day: '2026-01-05', startsAt: '2026-01-05T09:00:00Z' },
      { day: '2026-01-06', startsAt: '2026-01-06T14:30:00Z' },
      { day: '2026-01-07', startsAt: '2026-01-07T09:00:00Z' },
    ]);
  });

  it('computes occurrence starts in the stored timezone across DST', () => {
    // 09:00 New York daily across the 2026-03-08 spring-forward: the wall-clock
    // time is preserved, so the UTC instant shifts 14:00Z -> 13:00Z.
    const occurrences = expandStoredCalendarEventRecurrence({
      records: [
        buildAnchorRecord({
          startsAt: '2026-03-07T14:00:00Z',
          recurrenceRule: 'FREQ=DAILY;COUNT=3',
          recurrenceTimezone: 'America/New_York',
        }),
      ],
      rangeStart: '2026-03-01T00:00:00Z',
      rangeEnd: '2026-03-15T00:00:00Z',
    });

    expect(occurrences).toEqual([
      { day: '2026-03-07', startsAt: '2026-03-07T14:00:00Z' },
      { day: '2026-03-08', startsAt: '2026-03-08T13:00:00Z' },
      { day: '2026-03-09', startsAt: '2026-03-09T13:00:00Z' },
    ]);
  });

  it('returns nothing when there is no stored anchor rule', () => {
    expect(
      expandStoredCalendarEventRecurrence({
        records: [
          {
            id: 'plain-id',
            startsAt: '2026-01-05T09:00:00Z',
            recurrenceRule: null,
            recurrenceTimezone: null,
            recurrenceSeriesId: null,
            recurrenceOccurrenceDay: null,
            recurrenceSkippedOccurrenceDays: null,
          },
        ],
        rangeStart: '2026-01-01T00:00:00Z',
        rangeEnd: '2026-01-10T00:00:00Z',
      }),
    ).toEqual([]);
  });

  it('clips a stored month-end series without drifting', () => {
    const occurrences = expandStoredCalendarEventRecurrence({
      records: [
        buildAnchorRecord({
          startsAt: '2026-01-31T09:00:00Z',
          recurrenceRule: 'FREQ=MONTHLY;COUNT=3',
        }),
      ],
      rangeStart: '2026-01-01T00:00:00Z',
      rangeEnd: '2026-05-01T00:00:00Z',
    });

    expect(occurrences.map((occurrence) => occurrence.day)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('clips a stored Feb 29 series to Feb 28 in non-leap years and back in leap years', () => {
    const occurrences = expandStoredCalendarEventRecurrence({
      records: [
        buildAnchorRecord({
          startsAt: '2028-02-29T09:00:00Z',
          recurrenceRule: 'FREQ=MONTHLY;INTERVAL=12;COUNT=2',
        }),
      ],
      rangeStart: '2028-01-01T00:00:00Z',
      rangeEnd: '2030-01-01T00:00:00Z',
    });

    expect(occurrences.map((occurrence) => occurrence.day)).toEqual([
      '2028-02-29',
      '2029-02-28',
    ]);
  });

  it('honours the stored weekly rule under the caller locale week start', () => {
    const buildRecords = () => [
      buildAnchorRecord({
        startsAt: '2026-01-07T09:00:00Z',
        recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=SU;COUNT=4',
      }),
    ];

    const mondayWeeks = expandStoredCalendarEventRecurrence({
      records: buildRecords(),
      rangeStart: '2026-01-01T00:00:00Z',
      rangeEnd: '2026-03-01T00:00:00Z',
      weekStartsOnDayIndex: 1,
    });
    const sundayWeeks = expandStoredCalendarEventRecurrence({
      records: buildRecords(),
      rangeStart: '2026-01-01T00:00:00Z',
      rangeEnd: '2026-03-01T00:00:00Z',
      weekStartsOnDayIndex: 0,
    });

    // Monday weeks: the first Sunday on/after DTSTART is Jan 11.
    expect(mondayWeeks.map((occurrence) => occurrence.day)).toEqual([
      '2026-01-11',
      '2026-01-25',
      '2026-02-08',
      '2026-02-22',
    ]);
    // Sunday weeks: Jan 4 is skipped (before DTSTART), so the series lands later.
    expect(sundayWeeks.map((occurrence) => occurrence.day)).toEqual([
      '2026-01-18',
      '2026-02-01',
      '2026-02-15',
    ]);
  });

  it('stays bounded over a long range when the stored rule carries a count', () => {
    const occurrences = expandStoredCalendarEventRecurrence({
      records: [
        buildAnchorRecord({
          startsAt: '2026-01-01T09:00:00Z',
          recurrenceRule: 'FREQ=DAILY;COUNT=5',
        }),
      ],
      rangeStart: '2026-01-01T00:00:00Z',
      rangeEnd: '2036-01-01T00:00:00Z',
    });

    expect(occurrences).toHaveLength(5);
    expect(occurrences[4].day).toBe('2026-01-05');
  });
});
