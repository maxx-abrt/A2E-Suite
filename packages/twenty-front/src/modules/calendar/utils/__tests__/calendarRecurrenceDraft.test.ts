import { Temporal } from 'temporal-polyfill';

import { type CalendarEventDraft } from '@/calendar/types/CalendarEventDraft';
import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { type CalendarRecurrenceDraft } from '@/calendar/types/CalendarRecurrenceDraft';
import { buildCalendarEventDraftFromEvent } from '@/calendar/utils/buildCalendarEventDraftFromEvent';
import { buildCalendarRecurrenceDraftFromRule } from '@/calendar/utils/buildCalendarRecurrenceDraftFromRule';
import { buildCalendarRecurrenceRuleFromDraft } from '@/calendar/utils/buildCalendarRecurrenceRuleFromDraft';
import { buildCalendarSeriesAnchorInputFromDraft } from '@/calendar/utils/buildCalendarSeriesAnchorInputFromDraft';
import { buildDefaultCalendarRecurrenceDraft } from '@/calendar/utils/buildDefaultCalendarRecurrenceDraft';
import { getCalendarMonthlyPositionForDay } from '@/calendar/utils/getCalendarMonthlyPositionForDay';
import { parseCalendarRecurrenceRule } from '@/calendar/utils/parseCalendarRecurrenceRule';
import { rebaseCalendarRecurrenceDraftOnStartDay } from '@/calendar/utils/rebaseCalendarRecurrenceDraftOnStartDay';
import { serializeCalendarRecurrenceRule } from '@/calendar/utils/serializeCalendarRecurrenceRule';

// 2026-07-14 is a Tuesday, the second Tuesday of July 2026.
const START_DAY = Temporal.PlainDate.from('2026-07-14');

const buildDraft = (
  overrides: Partial<CalendarRecurrenceDraft>,
): CalendarRecurrenceDraft => ({
  ...buildDefaultCalendarRecurrenceDraft({
    frequency: 'weekly',
    startDay: START_DAY,
  }),
  ...overrides,
});

const buildEventDraft = (
  overrides: Partial<CalendarEventDraft>,
): CalendarEventDraft => ({
  title: 'Standup',
  description: '',
  location: '',
  isFullDay: false,
  isCanceled: false,
  startDay: START_DAY,
  startHour: 9,
  startMinute: 0,
  endDay: START_DAY,
  endHour: 9,
  endMinute: 30,
  recurrence: null,
  ...overrides,
});

const buildEvent = (
  overrides: Partial<CalendarEventRecord>,
): CalendarEventRecord => ({
  id: 'event-1',
  title: 'Event',
  description: null,
  location: null,
  startsAt: '2026-07-14T07:00:00Z',
  endsAt: '2026-07-14T07:30:00Z',
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

describe('getCalendarMonthlyPositionForDay', () => {
  it('derives the ordinal weekday of the day', () => {
    expect(getCalendarMonthlyPositionForDay(START_DAY)).toEqual({
      weekday: 'TU',
      ordinal: 2,
    });
  });

  it('maps a fifth weekday to "last"', () => {
    expect(
      getCalendarMonthlyPositionForDay(Temporal.PlainDate.from('2026-07-31')),
    ).toEqual({ weekday: 'FR', ordinal: -1 });
  });
});

describe('buildDefaultCalendarRecurrenceDraft', () => {
  it('anchors weekly and monthly defaults on the start day, open-ended', () => {
    expect(
      buildDefaultCalendarRecurrenceDraft({
        frequency: 'weekly',
        startDay: START_DAY,
      }),
    ).toEqual({
      frequency: 'weekly',
      interval: 1,
      byWeekdays: ['TU'],
      monthlyMode: 'day-of-month',
      monthlyPosition: { weekday: 'TU', ordinal: 2 },
      endMode: 'never',
      count: 10,
      untilDay: Temporal.PlainDate.from('2026-10-14'),
    });
  });
});

describe('buildCalendarRecurrenceRuleFromDraft', () => {
  it('builds a weekly rule on sorted unique weekdays', () => {
    const rule = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({ byWeekdays: ['FR', 'MO', 'FR'], interval: 2 }),
      startDay: START_DAY,
      seriesTimeZone: 'Europe/Paris',
    });

    expect(serializeCalendarRecurrenceRule(rule)).toBe(
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR',
    );
  });

  it('falls back to the start weekday when no weekday is selected', () => {
    const rule = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({ byWeekdays: [] }),
      startDay: START_DAY,
      seriesTimeZone: 'UTC',
    });

    expect(rule.byWeekdays).toEqual(['TU']);
  });

  it('ignores weekdays for a daily rule and clamps the interval', () => {
    const rule = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({ frequency: 'daily', interval: 0 }),
      startDay: START_DAY,
      seriesTimeZone: 'UTC',
    });

    expect(serializeCalendarRecurrenceRule(rule)).toBe('FREQ=DAILY');
  });

  it('builds the three monthly selectors', () => {
    const byDate = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({
        frequency: 'monthly',
        monthlyMode: 'day-of-month',
      }),
      startDay: START_DAY,
      seriesTimeZone: 'UTC',
    });
    const byPosition = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({
        frequency: 'monthly',
        monthlyMode: 'weekday-position',
        monthlyPosition: { weekday: 'FR', ordinal: -1 },
      }),
      startDay: START_DAY,
      seriesTimeZone: 'UTC',
    });
    const byWeekdays = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({
        frequency: 'monthly',
        monthlyMode: 'weekdays',
        byWeekdays: ['TU', 'TH'],
      }),
      startDay: START_DAY,
      seriesTimeZone: 'UTC',
    });

    expect(serializeCalendarRecurrenceRule(byDate)).toBe('FREQ=MONTHLY');
    expect(serializeCalendarRecurrenceRule(byPosition)).toBe(
      'FREQ=MONTHLY;BYDAY=-1FR',
    );
    expect(serializeCalendarRecurrenceRule(byWeekdays)).toBe(
      'FREQ=MONTHLY;BYDAY=TU,TH',
    );
  });

  it('writes COUNT or an inclusive end-of-day UNTIL in the series zone', () => {
    const counted = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({ endMode: 'count', count: 5 }),
      startDay: START_DAY,
      seriesTimeZone: 'UTC',
    });
    const bounded = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({
        endMode: 'until',
        untilDay: Temporal.PlainDate.from('2026-08-04'),
      }),
      startDay: START_DAY,
      seriesTimeZone: 'Europe/Paris',
    });

    expect(counted.count).toBe(5);
    expect(counted.until).toBeNull();
    expect(bounded.count).toBeNull();
    expect(bounded.until).toBe('2026-08-04T21:59:59.999Z');
  });

  it('never ends a series before its start day', () => {
    const rule = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({
        endMode: 'until',
        untilDay: Temporal.PlainDate.from('2026-07-01'),
      }),
      startDay: START_DAY,
      seriesTimeZone: 'UTC',
    });

    expect(rule.until).toBe('2026-07-14T23:59:59.999Z');
  });

  it('produces rules the stored-rule parser reads back unchanged', () => {
    const rule = buildCalendarRecurrenceRuleFromDraft({
      recurrence: buildDraft({
        frequency: 'monthly',
        monthlyMode: 'weekday-position',
        endMode: 'until',
      }),
      startDay: START_DAY,
      seriesTimeZone: 'America/New_York',
    });

    expect(
      parseCalendarRecurrenceRule(serializeCalendarRecurrenceRule(rule)),
    ).toEqual(rule);
  });
});

describe('buildCalendarRecurrenceDraftFromRule', () => {
  it('round-trips a saved rule through the draft', () => {
    const storedRule = parseCalendarRecurrenceRule(
      'FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,WE;UNTIL=2026-09-30T21:59:59.999Z',
    );

    if (storedRule === null) {
      throw new Error('fixture rule must parse');
    }

    const draft = buildCalendarRecurrenceDraftFromRule({
      rule: storedRule,
      startDay: START_DAY,
      seriesTimeZone: 'Europe/Paris',
    });

    expect(draft.endMode).toBe('until');
    expect(draft.untilDay.toString()).toBe('2026-09-30');
    expect(
      buildCalendarRecurrenceRuleFromDraft({
        recurrence: draft,
        startDay: START_DAY,
        seriesTimeZone: 'Europe/Paris',
      }),
    ).toEqual(storedRule);
  });

  it('keeps a monthly-by-weekdays rule the picker cannot create itself', () => {
    const storedRule = parseCalendarRecurrenceRule('FREQ=MONTHLY;BYDAY=TU');

    if (storedRule === null) {
      throw new Error('fixture rule must parse');
    }

    const draft = buildCalendarRecurrenceDraftFromRule({
      rule: storedRule,
      startDay: START_DAY,
      seriesTimeZone: 'UTC',
    });

    expect(draft.monthlyMode).toBe('weekdays');
    expect(
      buildCalendarRecurrenceRuleFromDraft({
        recurrence: draft,
        startDay: START_DAY,
        seriesTimeZone: 'UTC',
      }),
    ).toEqual(storedRule);
  });
});

describe('rebaseCalendarRecurrenceDraftOnStartDay', () => {
  it('moves an untouched default weekday and monthly position to the new day', () => {
    const rebased = rebaseCalendarRecurrenceDraftOnStartDay({
      recurrence: buildDraft({ monthlyMode: 'weekday-position' }),
      previousStartDay: START_DAY,
      nextStartDay: Temporal.PlainDate.from('2026-07-17'),
    });

    expect(rebased.byWeekdays).toEqual(['FR']);
    expect(rebased.monthlyPosition).toEqual({ weekday: 'FR', ordinal: 3 });
  });

  it('keeps a weekday selection the user customised', () => {
    const rebased = rebaseCalendarRecurrenceDraftOnStartDay({
      recurrence: buildDraft({ byWeekdays: ['MO', 'TU'] }),
      previousStartDay: START_DAY,
      nextStartDay: Temporal.PlainDate.from('2026-07-17'),
    });

    expect(rebased.byWeekdays).toEqual(['MO', 'TU']);
  });
});

describe('buildCalendarSeriesAnchorInputFromDraft', () => {
  it('returns null for an event that does not repeat', () => {
    expect(
      buildCalendarSeriesAnchorInputFromDraft({
        draft: buildEventDraft({}),
        timeZone: 'Europe/Paris',
        seriesAnchorEventId: 'event-1',
      }),
    ).toBeNull();
  });

  it('stamps rule, author zone and the series id derived from the anchor id', () => {
    expect(
      buildCalendarSeriesAnchorInputFromDraft({
        draft: buildEventDraft({ recurrence: buildDraft({}) }),
        timeZone: 'Europe/Paris',
        seriesAnchorEventId: 'event-1',
      }),
    ).toEqual({
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
      recurrenceTimezone: 'Europe/Paris',
      recurrenceSeriesId: 'calendar-series#event-1',
      recurrenceOccurrenceDay: null,
    });
  });

  it('stores all-day series in UTC', () => {
    expect(
      buildCalendarSeriesAnchorInputFromDraft({
        draft: buildEventDraft({
          isFullDay: true,
          recurrence: buildDraft({ frequency: 'daily' }),
        }),
        timeZone: 'America/New_York',
        seriesAnchorEventId: 'event-2',
      })?.recurrenceTimezone,
    ).toBe('UTC');
  });
});

describe('buildCalendarEventDraftFromEvent — recurrence', () => {
  it('reopens a series anchor on its stored rule', () => {
    const draft = buildCalendarEventDraftFromEvent({
      event: buildEvent({
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU;COUNT=4',
        recurrenceTimezone: 'Europe/Paris',
        recurrenceSeriesId: 'calendar-series#event-1',
      }),
      timeZone: 'Europe/Paris',
    });

    expect(draft.recurrence).toMatchObject({
      frequency: 'weekly',
      byWeekdays: ['TU'],
      endMode: 'count',
      count: 4,
    });
  });

  it('leaves plain and detached rows without a repeat draft', () => {
    expect(
      buildCalendarEventDraftFromEvent({
        event: buildEvent({}),
        timeZone: 'UTC',
      }).recurrence,
    ).toBeNull();
    expect(
      buildCalendarEventDraftFromEvent({
        event: buildEvent({
          recurrenceSeriesId: 'calendar-series#anchor',
          recurrenceOccurrenceDay: '2026-07-14',
        }),
        timeZone: 'UTC',
      }).recurrence,
    ).toBeNull();
  });
});
