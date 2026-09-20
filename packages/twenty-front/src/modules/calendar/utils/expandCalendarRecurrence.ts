import { Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';

import { type CalendarRecurrenceOccurrence } from '@/calendar/types/CalendarRecurrenceOccurrence';
import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import {
  CALENDAR_RECURRENCE_WEEKDAYS,
  CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK,
  type CalendarRecurrenceWeekday,
} from '@/calendar/types/CalendarRecurrenceWeekday';

// Weekly steps are anchored on ISO weeks (Monday first) so the locale week start
// the grid renders with never changes which dates a rule selects.
const getIsoWeekMonday = (day: Temporal.PlainDate): Temporal.PlainDate =>
  day.subtract({ days: day.dayOfWeek - 1 });

const sortWeekdays = (
  weekdays: CalendarRecurrenceWeekday[],
): CalendarRecurrenceWeekday[] =>
  [...weekdays].sort(
    (left, right) =>
      CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[left] -
      CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[right],
  );

function* iterateCalendarRecurrenceDays({
  rule,
  seriesStartDate,
}: {
  rule: CalendarRecurrenceRule;
  seriesStartDate: Temporal.PlainDate;
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
    const firstWeekMonday = getIsoWeekMonday(seriesStartDate);

    for (let week = 0; ; week += 1) {
      const weekMonday = firstWeekMonday.add({ weeks: rule.interval * week });

      for (const weekday of weekdays) {
        const day = weekMonday.add({
          days: CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[weekday] - 1,
        });

        // RFC 5545: a weekly BYDAY may name days before DTSTART, but the
        // recurrence set itself starts at DTSTART.
        if (Temporal.PlainDate.compare(day, seriesStartDate) < 0) {
          continue;
        }

        yield day;
      }
    }
  }

  // `monthly` is modelled (see CalendarRecurrenceRule) but expansion is a later
  // slice (P4C.3b); yielding nothing keeps this engine honest until then.
}

// Expands a daily/weekly rule over the half-open instant window
// [rangeStart, rangeEnd). Occurrences keep the series start's wall-clock time in
// `timeZone` (`compatible` disambiguation, same DST contract as
// buildCalendarEventInstant), so a 09:00 series stays at 09:00 across a DST
// change even though its instants shift. `count` counts from the series start,
// not from rangeStart, so a window opened later still respects it.
export const expandCalendarRecurrence = ({
  rule,
  seriesStart,
  rangeStart,
  rangeEnd,
  timeZone,
}: {
  rule: CalendarRecurrenceRule;
  seriesStart: string;
  rangeStart: string;
  rangeEnd: string;
  timeZone: string;
}): CalendarRecurrenceOccurrence[] => {
  if (rule.interval < 1) {
    return [];
  }

  const rangeStartInstant = Temporal.Instant.from(rangeStart);
  const rangeEndInstant = Temporal.Instant.from(rangeEnd);

  if (Temporal.Instant.compare(rangeEndInstant, rangeStartInstant) <= 0) {
    return [];
  }

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

  for (const day of iterateCalendarRecurrenceDays({ rule, seriesStartDate })) {
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
