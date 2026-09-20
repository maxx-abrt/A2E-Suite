import { Temporal } from 'temporal-polyfill';
import { isDefined } from '@/utils/validation';

import {
  CALENDAR_RECURRENCE_FREQUENCIES,
  CALENDAR_RECURRENCE_FREQUENCY_TO_TOKEN,
} from '../types/CalendarRecurrenceFrequency';
import { type CalendarRecurrenceMonthlyPosition } from '../types/CalendarRecurrenceMonthlyPosition';
import { type CalendarRecurrenceRule } from '../types/CalendarRecurrenceRule';
import {
  CALENDAR_RECURRENCE_WEEKDAYS,
  CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK,
  type CalendarRecurrenceWeekday,
} from '../types/CalendarRecurrenceWeekday';

const POSITIVE_INTEGER_PATTERN = /^\d+$/;

// Optional ordinal (1..4 or -1) followed by an RFC 5545 weekday token.
const MONTHLY_BYDAY_PATTERN = /^(-?\d+)?(MO|TU|WE|TH|FR|SA|SU)$/;

const KNOWN_RULE_KEYS = ['FREQ', 'INTERVAL', 'BYDAY', 'COUNT', 'UNTIL'];

const isCalendarRecurrenceWeekday = (
  value: string,
): value is CalendarRecurrenceWeekday =>
  CALENDAR_RECURRENCE_WEEKDAYS.some((weekday) => weekday === value);

const parsePositiveInteger = (value: string): number | null => {
  if (!POSITIVE_INTEGER_PATTERN.test(value)) {
    return null;
  }

  const parsed = Number(value);

  return parsed > 0 ? parsed : null;
};

const sortWeekdays = (
  weekdays: CalendarRecurrenceWeekday[],
): CalendarRecurrenceWeekday[] =>
  [...weekdays].sort(
    (left, right) =>
      CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[left] -
      CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[right],
  );

// Inverse of serializeCalendarRecurrenceRule. Returns null for anything the
// model cannot represent, so a corrupt or future token is never silently
// dropped: FREQ required, COUNT/UNTIL mutually exclusive, daily has no BYDAY,
// weekly BYDAY are plain weekdays, monthly BYDAY are either plain weekdays
// (all-Tuesdays) or a single ordinal weekday (second Tuesday / last Friday).
export const parseCalendarRecurrenceRule = (
  serializedRule: string,
): CalendarRecurrenceRule | null => {
  const parts = serializedRule
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  const valuesByKey = new Map<string, string>();

  for (const part of parts) {
    const separatorIndex = part.indexOf('=');

    if (separatorIndex <= 0) {
      return null;
    }

    const key = part.slice(0, separatorIndex).toUpperCase();
    const value = part.slice(separatorIndex + 1);

    if (
      valuesByKey.has(key) ||
      value.length === 0 ||
      !KNOWN_RULE_KEYS.includes(key)
    ) {
      return null;
    }

    valuesByKey.set(key, value);
  }

  const frequencyToken = valuesByKey.get('FREQ');
  const frequency = CALENDAR_RECURRENCE_FREQUENCIES.find(
    (candidate) =>
      CALENDAR_RECURRENCE_FREQUENCY_TO_TOKEN[candidate] === frequencyToken,
  );

  if (!isDefined(frequency)) {
    return null;
  }

  const intervalValue = valuesByKey.get('INTERVAL');
  const interval = isDefined(intervalValue)
    ? parsePositiveInteger(intervalValue)
    : 1;

  if (!isDefined(interval)) {
    return null;
  }

  const countValue = valuesByKey.get('COUNT');
  const count = isDefined(countValue) ? parsePositiveInteger(countValue) : null;

  if (isDefined(countValue) && !isDefined(count)) {
    return null;
  }

  const untilValue = valuesByKey.get('UNTIL');
  let until: string | null = null;

  if (isDefined(untilValue)) {
    try {
      until = Temporal.Instant.from(untilValue).toString();
    } catch {
      return null;
    }
  }

  if (isDefined(count) && isDefined(until)) {
    return null;
  }

  const byDayValue = valuesByKey.get('BYDAY');
  let byWeekdays: CalendarRecurrenceWeekday[] = [];
  let monthlyPosition: CalendarRecurrenceMonthlyPosition | null = null;

  if (isDefined(byDayValue)) {
    const byDayTokens = byDayValue.split(',').map((token) => token.trim());

    if (byDayTokens.some((token) => token.length === 0)) {
      return null;
    }

    if (frequency === 'daily') {
      return null;
    }

    if (frequency === 'weekly') {
      const weeklyWeekdays: CalendarRecurrenceWeekday[] = [];

      for (const token of byDayTokens) {
        if (!isCalendarRecurrenceWeekday(token)) {
          return null;
        }

        weeklyWeekdays.push(token);
      }

      byWeekdays = sortWeekdays([...new Set(weeklyWeekdays)]);
    }

    if (frequency === 'monthly') {
      const plainWeekdays: CalendarRecurrenceWeekday[] = [];
      const monthlyPositions: CalendarRecurrenceMonthlyPosition[] = [];

      for (const token of byDayTokens) {
        const match = MONTHLY_BYDAY_PATTERN.exec(token);

        if (!isDefined(match)) {
          return null;
        }

        const ordinalToken = match[1];
        const weekdayToken = match[2];

        if (!isDefined(weekdayToken)) {
          return null;
        }

        const weekday = weekdayToken as CalendarRecurrenceWeekday;

        if (!isDefined(ordinalToken)) {
          plainWeekdays.push(weekday);
          continue;
        }

        const ordinal = Number(ordinalToken);

        if (ordinal !== -1 && (ordinal < 1 || ordinal > 4)) {
          return null;
        }

        monthlyPositions.push({ weekday, ordinal });
      }

      if (plainWeekdays.length > 0 && monthlyPositions.length > 0) {
        return null;
      }

      if (monthlyPositions.length > 1) {
        return null;
      }

      byWeekdays = sortWeekdays([...new Set(plainWeekdays)]);
      monthlyPosition = monthlyPositions[0] ?? null;
    }
  }

  return {
    frequency,
    interval,
    byWeekdays,
    monthlyPosition,
    count,
    until,
  };
};
