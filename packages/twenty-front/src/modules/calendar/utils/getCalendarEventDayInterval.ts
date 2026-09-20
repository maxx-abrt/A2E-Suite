import { Temporal } from 'temporal-polyfill';
import { isDefined, parseToInstantOrThrow } from 'twenty-shared/utils';

import { CALENDAR_DAY_MINUTES } from '@/calendar/constants/CalendarDayMinutes';
import { CALENDAR_MIN_EVENT_MINUTES } from '@/calendar/constants/CalendarMinEventMinutes';
import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';

// Where a timed event sits inside one day, in minutes since midnight in the
// user's time zone. Events spanning several days are clipped to the given day;
// all-day events return null because they render in the all-day lane.
export const getCalendarEventDayInterval = ({
  event,
  day,
  timeZone,
}: {
  event: CalendarEventRecord;
  day: Temporal.PlainDate;
  timeZone: string;
}): { startMinutes: number; endMinutes: number } | null => {
  if (event.isFullDay || !isDefined(event.startsAt)) {
    return null;
  }

  try {
    const startZonedDateTime = parseToInstantOrThrow(
      event.startsAt,
    ).toZonedDateTimeISO(timeZone);
    const endZonedDateTime = isDefined(event.endsAt)
      ? parseToInstantOrThrow(event.endsAt).toZonedDateTimeISO(timeZone)
      : startZonedDateTime.add({ minutes: CALENDAR_MIN_EVENT_MINUTES });
    const startDay = startZonedDateTime.toPlainDate();
    const endDay = endZonedDateTime.toPlainDate();

    if (
      Temporal.PlainDate.compare(day, startDay) === -1 ||
      Temporal.PlainDate.compare(day, endDay) === 1
    ) {
      return null;
    }

    const startMinutes =
      Temporal.PlainDate.compare(day, startDay) === 0
        ? startZonedDateTime.hour * 60 + startZonedDateTime.minute
        : 0;
    let endMinutes =
      Temporal.PlainDate.compare(day, endDay) === 0
        ? endZonedDateTime.hour * 60 + endZonedDateTime.minute
        : CALENDAR_DAY_MINUTES;

    if (endMinutes <= startMinutes) {
      endMinutes = Math.min(
        startMinutes + CALENDAR_MIN_EVENT_MINUTES,
        CALENDAR_DAY_MINUTES,
      );
    }

    return { startMinutes, endMinutes };
  } catch {
    return null;
  }
};
