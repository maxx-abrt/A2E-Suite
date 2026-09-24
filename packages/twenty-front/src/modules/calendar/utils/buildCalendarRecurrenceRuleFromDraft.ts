import { Temporal } from 'temporal-polyfill';
import { CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK } from 'twenty-shared/utils';

import { type CalendarRecurrenceDraft } from '@/calendar/types/CalendarRecurrenceDraft';
import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import { type CalendarRecurrenceWeekday } from '@/calendar/types/CalendarRecurrenceWeekday';
import {
  getCalendarMonthlyPositionForDay,
  getCalendarRecurrenceWeekdayForDay,
} from '@/calendar/utils/getCalendarMonthlyPositionForDay';

const MAX_RECURRENCE_INTERVAL = 99;
const MAX_RECURRENCE_COUNT = 999;

const clampPositiveInteger = (value: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(value), 1), max);
};

const normalizeWeekdays = (
  weekdays: CalendarRecurrenceWeekday[],
  fallback: CalendarRecurrenceWeekday,
): CalendarRecurrenceWeekday[] => {
  const uniqueWeekdays = [...new Set(weekdays)].sort(
    (left, right) =>
      CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[left] -
      CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[right],
  );

  return uniqueWeekdays.length > 0 ? uniqueWeekdays : [fallback];
};

// UNTIL is an inclusive instant: the last millisecond of the chosen day in the
// series time zone, so an occurrence at any time on that day is still kept. A
// day before the series start is moved to the start day (never an empty series).
const buildUntilInstant = ({
  untilDay,
  startDay,
  seriesTimeZone,
}: {
  untilDay: Temporal.PlainDate;
  startDay: Temporal.PlainDate;
  seriesTimeZone: string;
}): string => {
  const lastDay =
    Temporal.PlainDate.compare(untilDay, startDay) < 0 ? startDay : untilDay;

  return lastDay
    .add({ days: 1 })
    .toZonedDateTime({ timeZone: seriesTimeZone })
    .toInstant()
    .subtract({ milliseconds: 1 })
    .toString();
};

// Draft -> the pure rule the shared engine expands and the anchor row stores.
// Out-of-range numbers are clamped rather than rejected so a half-typed value
// can never produce a rule the parser would refuse on read-back.
export const buildCalendarRecurrenceRuleFromDraft = ({
  recurrence,
  startDay,
  seriesTimeZone,
}: {
  recurrence: CalendarRecurrenceDraft;
  startDay: Temporal.PlainDate;
  seriesTimeZone: string;
}): CalendarRecurrenceRule => {
  const startWeekday = getCalendarRecurrenceWeekdayForDay(startDay);
  const isMonthly = recurrence.frequency === 'monthly';

  const byWeekdays =
    recurrence.frequency === 'weekly' ||
    (isMonthly && recurrence.monthlyMode === 'weekdays')
      ? normalizeWeekdays(recurrence.byWeekdays, startWeekday)
      : [];

  const monthlyPosition =
    isMonthly && recurrence.monthlyMode === 'weekday-position'
      ? (recurrence.monthlyPosition ??
        getCalendarMonthlyPositionForDay(startDay))
      : null;

  return {
    frequency: recurrence.frequency,
    interval: clampPositiveInteger(
      recurrence.interval,
      MAX_RECURRENCE_INTERVAL,
    ),
    byWeekdays,
    monthlyPosition,
    count:
      recurrence.endMode === 'count'
        ? clampPositiveInteger(recurrence.count, MAX_RECURRENCE_COUNT)
        : null,
    until:
      recurrence.endMode === 'until'
        ? buildUntilInstant({
            untilDay: recurrence.untilDay,
            startDay,
            seriesTimeZone,
          })
        : null,
  };
};
