import { Temporal } from 'temporal-polyfill';
import { isDefined } from '@/utils/validation';

import { type CalendarRecurrenceOccurrence } from '../types/CalendarRecurrenceOccurrence';
import { type CalendarRecurrenceRule } from '../types/CalendarRecurrenceRule';
import {
  CALENDAR_RECURRENCE_WEEKDAYS,
  CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK,
  type CalendarRecurrenceWeekday,
} from '../types/CalendarRecurrenceWeekday';
import { normalizeWeekStartDay } from './normalizeWeekStartDay';

// The grid preference is 0=Sunday..6=Saturday; the recurrence maths needs the
// ISO weekday (1=Monday..7=Sunday). normalizeWeekStartDay is the single source of
// the fallback, so week-boundary logic is never forked per caller.
const getWeekStartIsoDay = (
  weekStartsOnDayIndex: number | null | undefined,
): number => {
  const normalizedWeekStartDay = normalizeWeekStartDay(weekStartsOnDayIndex);

  return normalizedWeekStartDay === 0 ? 7 : normalizedWeekStartDay;
};

// Start of the locale week that contains `day`.
const getWeekAnchor = (
  day: Temporal.PlainDate,
  weekStartIsoDay: number,
): Temporal.PlainDate =>
  day.subtract({ days: (day.dayOfWeek - weekStartIsoDay + 7) % 7 });

const getWeekdayOffset = (
  weekday: CalendarRecurrenceWeekday,
  weekStartIsoDay: number,
): number =>
  (CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[weekday] - weekStartIsoDay + 7) %
  7;

const sortWeekdays = (
  weekdays: CalendarRecurrenceWeekday[],
): CalendarRecurrenceWeekday[] =>
  [...weekdays].sort(
    (left, right) =>
      CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[left] -
      CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[right],
  );

// First date with `weekdayIsoDay` inside the month of `monthAnchor`.
const getFirstWeekdayOfMonth = ({
  monthAnchor,
  weekdayIsoDay,
}: {
  monthAnchor: Temporal.PlainDate;
  weekdayIsoDay: number;
}): Temporal.PlainDate => {
  const firstOfMonth = monthAnchor.with({ day: 1 });

  return firstOfMonth.add({
    days: (weekdayIsoDay - firstOfMonth.dayOfWeek + 7) % 7,
  });
};

// Dates a monthly rule selects inside the month of `monthAnchor`, ascending, so
// the caller's early exit on rangeEnd/count/until stays valid.
const getMonthlyDatesInMonth = ({
  rule,
  monthAnchor,
}: {
  rule: CalendarRecurrenceRule;
  monthAnchor: Temporal.PlainDate;
}): Temporal.PlainDate[] => {
  if (isDefined(rule.monthlyPosition)) {
    const firstWeekday = getFirstWeekdayOfMonth({
      monthAnchor,
      weekdayIsoDay:
        CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[
          rule.monthlyPosition.weekday
        ],
    });

    // The model only allows 1..4 or -1, so a position always exists: no month is
    // ever empty and the generator can never spin without producing a date.
    if (rule.monthlyPosition.ordinal < 0) {
      return [
        firstWeekday.add({
          days:
            7 * Math.floor((firstWeekday.daysInMonth - firstWeekday.day) / 7),
        }),
      ];
    }

    return [firstWeekday.add({ days: 7 * (rule.monthlyPosition.ordinal - 1) })];
  }

  if (rule.byWeekdays.length > 0) {
    return rule.byWeekdays
      .flatMap((weekday) => {
        const firstWeekday = getFirstWeekdayOfMonth({
          monthAnchor,
          weekdayIsoDay: CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[weekday],
        });
        const dates: Temporal.PlainDate[] = [];

        for (
          let date = firstWeekday;
          date.month === monthAnchor.month;
          date = date.add({ days: 7 })
        ) {
          dates.push(date);
        }

        return dates;
      })
      .sort((left, right) => Temporal.PlainDate.compare(left, right));
  }

  // Monthly by date: `monthAnchor` is seriesStartDate shifted by whole months and
  // Temporal constrains the day to the target month, so a 31st series clips to
  // that month's last day without drifting (each step is measured from DTSTART).
  return [monthAnchor];
};

function* iterateCalendarRecurrenceDays({
  rule,
  seriesStartDate,
  weekStartIsoDay,
}: {
  rule: CalendarRecurrenceRule;
  seriesStartDate: Temporal.PlainDate;
  weekStartIsoDay: number;
}): Generator<Temporal.PlainDate> {
  if (rule.frequency === 'daily') {
    for (let step = 0; ; step += 1) {
      yield seriesStartDate.add({ days: rule.interval * step });
    }
  }

  if (rule.frequency === 'weekly') {
    const weekdays =
      rule.byWeekdays.length > 0
        ? sortWeekdays(rule.byWeekdays)
        : [CALENDAR_RECURRENCE_WEEKDAYS[seriesStartDate.dayOfWeek - 1]];
    // Order by offset from the week anchor (not ISO) so a Sunday-start week
    // yields Sunday before Monday; a non-monotonic stream would break the
    // caller's break-on-rangeEnd.
    const weekdayOffsets = weekdays
      .map((weekday) => getWeekdayOffset(weekday, weekStartIsoDay))
      .sort((left, right) => left - right);
    const firstWeekAnchor = getWeekAnchor(seriesStartDate, weekStartIsoDay);

    for (let week = 0; ; week += 1) {
      const weekAnchor = firstWeekAnchor.add({ weeks: rule.interval * week });

      for (const weekdayOffset of weekdayOffsets) {
        const day = weekAnchor.add({ days: weekdayOffset });

        // RFC 5545: a weekly BYDAY may name days before DTSTART, but the
        // recurrence set itself starts at DTSTART.
        if (Temporal.PlainDate.compare(day, seriesStartDate) < 0) {
          continue;
        }

        yield day;
      }
    }
  }

  if (rule.frequency === 'monthly') {
    for (let step = 0; ; step += 1) {
      const monthAnchor = seriesStartDate.add({
        months: rule.interval * step,
      });

      for (const day of getMonthlyDatesInMonth({
        rule,
        monthAnchor,
      })) {
        // BYDAY/BYPOSITION in the first month may sit before DTSTART; skip those
        // so the recurrence set starts at the series start.
        if (Temporal.PlainDate.compare(day, seriesStartDate) < 0) {
          continue;
        }

        yield day;
      }
    }
  }
}

// Expands a daily/weekly/monthly rule over the half-open instant window
// [rangeStart, rangeEnd). Occurrences keep the series start's wall-clock time in
// `timeZone` (`compatible` disambiguation, same DST contract as
// buildCalendarEventInstant), so a 09:00 series stays at 09:00 across a DST
// change even though its instants shift. `count` counts from the series start,
// not from rangeStart, so a window opened later still respects it. Weekly
// interval steps are anchored on the caller's locale week start (Monday when
// absent), normalised through normalizeWeekStartDay.
export const expandCalendarRecurrence = ({
  rule,
  seriesStart,
  rangeStart,
  rangeEnd,
  timeZone,
  weekStartsOnDayIndex,
}: {
  rule: CalendarRecurrenceRule;
  seriesStart: string;
  rangeStart: string;
  rangeEnd: string;
  timeZone: string;
  weekStartsOnDayIndex?: number | null;
}): CalendarRecurrenceOccurrence[] => {
  if (rule.interval < 1) {
    return [];
  }

  const rangeStartInstant = Temporal.Instant.from(rangeStart);
  const rangeEndInstant = Temporal.Instant.from(rangeEnd);

  if (Temporal.Instant.compare(rangeEndInstant, rangeStartInstant) <= 0) {
    return [];
  }

  const weekStartIsoDay = getWeekStartIsoDay(weekStartsOnDayIndex);
  const seriesStartZonedDateTime =
    Temporal.Instant.from(seriesStart).toZonedDateTimeISO(timeZone);
  const seriesStartDate = seriesStartZonedDateTime.toPlainDate();
  const wallClockTime = {
    hour: seriesStartZonedDateTime.hour,
    minute: seriesStartZonedDateTime.minute,
    second: seriesStartZonedDateTime.second,
    millisecond: seriesStartZonedDateTime.millisecond,
  };
  const untilInstant = isDefined(rule.until)
    ? Temporal.Instant.from(rule.until)
    : null;

  const occurrences: CalendarRecurrenceOccurrence[] = [];
  let ordinal = 0;

  for (const day of iterateCalendarRecurrenceDays({
    rule,
    seriesStartDate,
    weekStartIsoDay,
  })) {
    if (isDefined(rule.count) && ordinal >= rule.count) {
      break;
    }

    const occurrenceInstant = Temporal.ZonedDateTime.from(
      {
        timeZone,
        year: day.year,
        month: day.month,
        day: day.day,
        ...wallClockTime,
      },
      { disambiguation: 'compatible' },
    ).toInstant();

    if (
      isDefined(untilInstant) &&
      Temporal.Instant.compare(occurrenceInstant, untilInstant) > 0
    ) {
      break;
    }

    if (Temporal.Instant.compare(occurrenceInstant, rangeEndInstant) >= 0) {
      break;
    }

    ordinal += 1;

    if (Temporal.Instant.compare(occurrenceInstant, rangeStartInstant) >= 0) {
      occurrences.push({
        day: day.toString(),
        startsAt: occurrenceInstant.toString(),
      });
    }
  }

  return occurrences;
};
