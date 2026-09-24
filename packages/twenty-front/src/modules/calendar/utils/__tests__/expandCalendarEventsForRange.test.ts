import { Temporal } from 'temporal-polyfill';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { expandCalendarEventsForRange } from '@/calendar/utils/expandCalendarEventsForRange';
import { getCalendarSeriesEvents } from '@/calendar/utils/getCalendarSeriesEvents';
import { groupCalendarEventsByDay } from '@/calendar/utils/groupCalendarEventsByDay';

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
  recurrenceRule: null,
  recurrenceTimezone: null,
  recurrenceSeriesId: null,
  recurrenceOccurrenceDay: null,
  recurrenceSkippedOccurrenceDays: null,
  ...overrides,
});

const WEEKLY_MONDAY_ANCHOR = buildEvent({
  id: 'anchor-1',
  title: 'Standup',
  startsAt: '2026-07-06T09:00:00Z',
  endsAt: '2026-07-06T09:30:00Z',
  recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
  recurrenceTimezone: 'UTC',
  recurrenceSeriesId: 'calendar-series#anchor-1',
});

const JULY_FIRST_DAY = Temporal.PlainDate.from('2026-07-01');
const JULY_LAST_DAY = Temporal.PlainDate.from('2026-07-31');

describe('expandCalendarEventsForRange', () => {
  it('passes plain events through untouched', () => {
    const plainEvent = buildEvent({
      id: 'plain',
      startsAt: '2026-07-10T10:00:00Z',
      endsAt: '2026-07-10T11:00:00Z',
    });

    const { events, occurrenceSourceByEventId } = expandCalendarEventsForRange({
      events: [plainEvent],
      timeZone: 'UTC',
      firstDay: JULY_FIRST_DAY,
      lastDay: JULY_LAST_DAY,
    });

    expect(events).toEqual([plainEvent]);
    expect(occurrenceSourceByEventId.size).toBe(0);
  });

  it('replaces a series anchor with one occurrence per rule day in range', () => {
    const { events, occurrenceSourceByEventId } = expandCalendarEventsForRange({
      events: [WEEKLY_MONDAY_ANCHOR],
      timeZone: 'UTC',
      firstDay: JULY_FIRST_DAY,
      lastDay: JULY_LAST_DAY,
    });

    const julyEvents = events.filter((event) =>
      event.startsAt?.startsWith('2026-07'),
    );

    expect(julyEvents.map((event) => event.id)).toEqual([
      'calendar-series#anchor-1@2026-07-06',
      'calendar-series#anchor-1@2026-07-13',
      'calendar-series#anchor-1@2026-07-20',
      'calendar-series#anchor-1@2026-07-27',
    ]);
    expect(julyEvents.map((event) => [event.startsAt, event.endsAt])).toEqual([
      ['2026-07-06T09:00:00Z', '2026-07-06T09:30:00Z'],
      ['2026-07-13T09:00:00Z', '2026-07-13T09:30:00Z'],
      ['2026-07-20T09:00:00Z', '2026-07-20T09:30:00Z'],
      ['2026-07-27T09:00:00Z', '2026-07-27T09:30:00Z'],
    ]);
    expect(
      occurrenceSourceByEventId.get('calendar-series#anchor-1@2026-07-20'),
    ).toEqual({ anchorEventId: 'anchor-1', occurrenceDay: '2026-07-20' });
    expect(julyEvents.every((event) => event.title === 'Standup')).toBe(true);
  });

  it('drops skipped days and days replaced by a detached sibling', () => {
    const detachedEvent = buildEvent({
      id: 'detached-1',
      title: 'Standup (moved)',
      startsAt: '2026-07-14T15:00:00Z',
      endsAt: '2026-07-14T15:30:00Z',
      recurrenceSeriesId: 'calendar-series#anchor-1',
      recurrenceOccurrenceDay: '2026-07-13',
    });

    const { events } = expandCalendarEventsForRange({
      events: [
        {
          ...WEEKLY_MONDAY_ANCHOR,
          recurrenceSkippedOccurrenceDays: '["2026-07-20"]',
        },
        detachedEvent,
      ],
      timeZone: 'UTC',
      firstDay: JULY_FIRST_DAY,
      lastDay: JULY_LAST_DAY,
    });

    const julyIds = events
      .filter((event) => event.startsAt?.startsWith('2026-07'))
      .map((event) => event.id)
      .sort();

    expect(julyIds).toEqual([
      'calendar-series#anchor-1@2026-07-06',
      'calendar-series#anchor-1@2026-07-27',
      'detached-1',
    ]);
  });

  it('matches detached rows written with the derived series id when the anchor was never stamped', () => {
    const { events } = expandCalendarEventsForRange({
      events: [
        { ...WEEKLY_MONDAY_ANCHOR, recurrenceSeriesId: null },
        buildEvent({
          id: 'detached-1',
          startsAt: '2026-07-13T12:00:00Z',
          endsAt: '2026-07-13T12:30:00Z',
          recurrenceSeriesId: 'calendar-series#anchor-1',
          recurrenceOccurrenceDay: '2026-07-13',
        }),
      ],
      timeZone: 'UTC',
      firstDay: Temporal.PlainDate.from('2026-07-13'),
      lastDay: Temporal.PlainDate.from('2026-07-19'),
    });

    const idsOnThirteenth = events
      .filter((event) => event.startsAt?.startsWith('2026-07-13'))
      .map((event) => event.id);

    expect(idsOnThirteenth).toEqual(['detached-1']);
  });

  it('keeps the series wall-clock time across a DST change', () => {
    const { events } = expandCalendarEventsForRange({
      events: [
        buildEvent({
          id: 'anchor-paris',
          startsAt: '2026-03-23T08:00:00Z',
          endsAt: '2026-03-23T09:00:00Z',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
          recurrenceTimezone: 'Europe/Paris',
          recurrenceSeriesId: 'calendar-series#anchor-paris',
        }),
      ],
      timeZone: 'Europe/Paris',
      firstDay: Temporal.PlainDate.from('2026-03-23'),
      lastDay: Temporal.PlainDate.from('2026-04-05'),
    });

    const visibleEvents = [
      ...groupCalendarEventsByDay({
        events,
        timeZone: 'Europe/Paris',
        firstDay: Temporal.PlainDate.from('2026-03-23'),
        lastDay: Temporal.PlainDate.from('2026-04-05'),
      }).values(),
    ]
      .flat()
      .map((span) => span.event);
    const localHours = visibleEvents.map(
      (event) =>
        Temporal.Instant.from(event.startsAt ?? '').toZonedDateTimeISO(
          'Europe/Paris',
        ).hour,
    );

    expect(visibleEvents.map((event) => event.startsAt)).toEqual([
      '2026-03-23T08:00:00Z',
      '2026-03-30T07:00:00Z',
    ]);
    expect(localHours).toEqual([9, 9]);
  });

  it('expands all-day series in UTC so each occurrence stays on its own day', () => {
    const { events } = expandCalendarEventsForRange({
      events: [
        buildEvent({
          id: 'anchor-all-day',
          isFullDay: true,
          startsAt: '2026-07-01T00:00:00Z',
          endsAt: '2026-07-02T00:00:00Z',
          recurrenceRule: 'FREQ=DAILY;INTERVAL=7',
          recurrenceTimezone: 'America/New_York',
          recurrenceSeriesId: 'calendar-series#anchor-all-day',
        }),
      ],
      timeZone: 'America/New_York',
      firstDay: JULY_FIRST_DAY,
      lastDay: Temporal.PlainDate.from('2026-07-15'),
    });

    const grouped = groupCalendarEventsByDay({
      events,
      timeZone: 'America/New_York',
      firstDay: JULY_FIRST_DAY,
      lastDay: Temporal.PlainDate.from('2026-07-15'),
    });

    expect([...grouped.keys()].sort()).toEqual([
      '2026-07-01',
      '2026-07-08',
      '2026-07-15',
    ]);
  });

  it('includes a multi-day occurrence that started before the first visible day', () => {
    const { events } = expandCalendarEventsForRange({
      events: [
        buildEvent({
          id: 'anchor-trip',
          startsAt: '2026-06-29T08:00:00Z',
          endsAt: '2026-07-02T18:00:00Z',
          recurrenceRule: 'FREQ=MONTHLY',
          recurrenceTimezone: 'UTC',
          recurrenceSeriesId: 'calendar-series#anchor-trip',
        }),
      ],
      timeZone: 'UTC',
      firstDay: JULY_FIRST_DAY,
      lastDay: Temporal.PlainDate.from('2026-07-05'),
    });

    const grouped = groupCalendarEventsByDay({
      events,
      timeZone: 'UTC',
      firstDay: JULY_FIRST_DAY,
      lastDay: Temporal.PlainDate.from('2026-07-05'),
    });

    expect([...grouped.keys()].sort()).toEqual(['2026-07-01', '2026-07-02']);
  });

  it('respects COUNT counted from the series start, not from the window', () => {
    const { events } = expandCalendarEventsForRange({
      events: [
        {
          ...WEEKLY_MONDAY_ANCHOR,
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=3',
        },
      ],
      timeZone: 'UTC',
      firstDay: Temporal.PlainDate.from('2026-07-15'),
      lastDay: JULY_LAST_DAY,
    });

    const grouped = groupCalendarEventsByDay({
      events,
      timeZone: 'UTC',
      firstDay: Temporal.PlainDate.from('2026-07-15'),
      lastDay: JULY_LAST_DAY,
    });

    expect([...grouped.values()].flat().map((span) => span.event.id)).toEqual([
      'calendar-series#anchor-1@2026-07-20',
    ]);
    expect(events.map((event) => event.id)).not.toContain(
      'calendar-series#anchor-1@2026-07-27',
    );
  });

  it('renders the stored row when the rule cannot be parsed', () => {
    const brokenAnchor = { ...WEEKLY_MONDAY_ANCHOR, recurrenceRule: 'NOPE' };

    const { events, occurrenceSourceByEventId } = expandCalendarEventsForRange({
      events: [brokenAnchor],
      timeZone: 'UTC',
      firstDay: JULY_FIRST_DAY,
      lastDay: JULY_LAST_DAY,
    });

    expect(events).toEqual([brokenAnchor]);
    expect(occurrenceSourceByEventId.size).toBe(0);
  });

  it('renders the stored row when the series time zone is unknown', () => {
    const anchorWithBadZone = {
      ...WEEKLY_MONDAY_ANCHOR,
      recurrenceTimezone: 'Not/AZone',
    };

    const { events } = expandCalendarEventsForRange({
      events: [anchorWithBadZone],
      timeZone: 'UTC',
      firstDay: JULY_FIRST_DAY,
      lastDay: JULY_LAST_DAY,
    });

    expect(events).toEqual([anchorWithBadZone]);
  });
});

describe('getCalendarSeriesEvents', () => {
  const detachedEvent = buildEvent({
    id: 'detached-1',
    startsAt: '2026-07-13T12:00:00Z',
    recurrenceSeriesId: 'calendar-series#anchor-1',
    recurrenceOccurrenceDay: '2026-07-13',
  });
  const unrelatedEvent = buildEvent({
    id: 'other',
    startsAt: '2026-07-13T12:00:00Z',
  });

  it('returns the anchor and every detached sibling of a series', () => {
    expect(
      getCalendarSeriesEvents({
        event: detachedEvent,
        events: [WEEKLY_MONDAY_ANCHOR, detachedEvent, unrelatedEvent],
      }),
    ).toEqual({
      anchorEvent: WEEKLY_MONDAY_ANCHOR,
      detachedEvents: [detachedEvent],
    });
  });

  it('finds detached siblings of an anchor whose series id was never stamped', () => {
    const unstampedAnchor = {
      ...WEEKLY_MONDAY_ANCHOR,
      recurrenceSeriesId: null,
    };

    expect(
      getCalendarSeriesEvents({
        event: unstampedAnchor,
        events: [unstampedAnchor, detachedEvent, unrelatedEvent],
      }),
    ).toEqual({
      anchorEvent: unstampedAnchor,
      detachedEvents: [detachedEvent],
    });
  });

  it('returns no series for a plain event', () => {
    expect(
      getCalendarSeriesEvents({
        event: unrelatedEvent,
        events: [WEEKLY_MONDAY_ANCHOR, detachedEvent, unrelatedEvent],
      }),
    ).toEqual({ anchorEvent: null, detachedEvents: [] });
  });
});
