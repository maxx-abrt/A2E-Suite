import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import { parseCalendarRecurrenceRule } from '@/calendar/utils/parseCalendarRecurrenceRule';
import { serializeCalendarRecurrenceRule } from '@/calendar/utils/serializeCalendarRecurrenceRule';

const DAILY_RULE: CalendarRecurrenceRule = {
  frequency: 'daily',
  interval: 1,
  byWeekdays: [],
  monthlyPosition: null,
  count: null,
  until: null,
};

describe('parseCalendarRecurrenceRule', () => {
  it('parses a minimal daily rule and fills the defaults', () => {
    expect(parseCalendarRecurrenceRule('FREQ=DAILY')).toEqual(DAILY_RULE);
  });

  it('parses interval and count', () => {
    expect(
      parseCalendarRecurrenceRule('FREQ=DAILY;INTERVAL=3;COUNT=10'),
    ).toEqual({
      ...DAILY_RULE,
      interval: 3,
      count: 10,
    });
  });

  it('sorts and deduplicates weekly BYDAY tokens in ISO order', () => {
    expect(
      parseCalendarRecurrenceRule('FREQ=WEEKLY;BYDAY=FR,MO,WE,MO'),
    ).toEqual({
      ...DAILY_RULE,
      frequency: 'weekly',
      byWeekdays: ['MO', 'WE', 'FR'],
    });
  });

  it('parses a monthly ordinal BYDAY into monthlyPosition', () => {
    expect(parseCalendarRecurrenceRule('FREQ=MONTHLY;BYDAY=2TU')).toEqual({
      ...DAILY_RULE,
      frequency: 'monthly',
      monthlyPosition: { weekday: 'TU', ordinal: 2 },
    });
  });

  it('parses a negative ordinal as the last weekday of the month', () => {
    expect(parseCalendarRecurrenceRule('FREQ=MONTHLY;BYDAY=-1FR')).toEqual({
      ...DAILY_RULE,
      frequency: 'monthly',
      monthlyPosition: { weekday: 'FR', ordinal: -1 },
    });
  });

  it('parses a plain monthly BYDAY as every listed weekday of the month', () => {
    expect(parseCalendarRecurrenceRule('FREQ=MONTHLY;BYDAY=TU')).toEqual({
      ...DAILY_RULE,
      frequency: 'monthly',
      byWeekdays: ['TU'],
    });
  });

  it('canonicalizes UNTIL to an ISO instant', () => {
    expect(
      parseCalendarRecurrenceRule('FREQ=DAILY;UNTIL=2026-12-31T00:00:00Z'),
    ).toEqual({
      ...DAILY_RULE,
      until: '2026-12-31T00:00:00Z',
    });
  });

  it.each([
    '',
    'FREQ',
    'FREQ=YEARLY',
    'INTERVAL=2',
    'FREQ=DAILY;INTERVAL=0',
    'FREQ=DAILY;INTERVAL=-1',
    'FREQ=DAILY;COUNT=0',
    'FREQ=DAILY;COUNT=2;UNTIL=2026-12-31T00:00:00Z',
    'FREQ=DAILY;UNTIL=not-a-date',
    'FREQ=DAILY;BYDAY=MO',
    'FREQ=WEEKLY;BYDAY=XX',
    'FREQ=MONTHLY;BYDAY=0TU',
    'FREQ=MONTHLY;BYDAY=5TU',
    'FREQ=MONTHLY;BYDAY=2TU,-1FR',
    'FREQ=MONTHLY;BYDAY=TU,2WE',
    'FREQ=DAILY;FOO=1',
    'FREQ=DAILY;FREQ=WEEKLY',
  ])('rejects the unsupported rule "%s"', (serializedRule) => {
    expect(parseCalendarRecurrenceRule(serializedRule)).toBeNull();
  });
});

describe('serializeCalendarRecurrenceRule', () => {
  it.each([
    'FREQ=DAILY',
    'FREQ=DAILY;INTERVAL=3;COUNT=10',
    'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=5',
    'FREQ=MONTHLY;BYDAY=2TU',
    'FREQ=MONTHLY;BYDAY=-1FR',
    'FREQ=MONTHLY;BYDAY=TU',
    'FREQ=DAILY;UNTIL=2026-12-31T00:00:00Z',
  ])('round-trips "%s"', (serializedRule) => {
    const rule = parseCalendarRecurrenceRule(serializedRule);

    expect(rule).not.toBeNull();
    expect(
      serializeCalendarRecurrenceRule(rule as CalendarRecurrenceRule),
    ).toBe(serializedRule);
    expect(
      parseCalendarRecurrenceRule(
        serializeCalendarRecurrenceRule(rule as CalendarRecurrenceRule),
      ),
    ).toEqual(rule);
  });

  it('drops the default interval when canonicalizing', () => {
    expect(
      serializeCalendarRecurrenceRule(
        parseCalendarRecurrenceRule(
          'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO',
        ) as CalendarRecurrenceRule,
      ),
    ).toBe('FREQ=WEEKLY;BYDAY=MO');
  });
});
