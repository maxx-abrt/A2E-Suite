import { Temporal } from 'temporal-polyfill';
import { isDefined, parseToInstantOrThrow } from 'twenty-shared/utils';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';

const isMidnightInTimeZone = (zonedDateTime: Temporal.ZonedDateTime): boolean =>
  zonedDateTime.hour === 0 &&
  zonedDateTime.minute === 0 &&
  zonedDateTime.second === 0;

// All-day ends are conventionally exclusive (the next midnight). Collapse that
// extra day so a one-day all-day event stays on a single calendar cell.
const getInclusiveEndDay = ({
  startDay,
  endDay,
  endsAtMidnight,
}: {
  startDay: Temporal.PlainDate;
  endDay: Temporal.PlainDate;
  endsAtMidnight: boolean;
}): Temporal.PlainDate => {
  if (endsAtMidnight && Temporal.PlainDate.compare(endDay, startDay) === 1) {
    return endDay.subtract({ days: 1 });
  }

  if (Temporal.PlainDate.compare(endDay, startDay) === -1) {
    return startDay;
  }

  return endDay;
};

export const getCalendarEventSpan = (
  event: CalendarEventRecord,
  timeZone: string,
): CalendarEventSpan | null => {
  if (!isDefined(event.startsAt)) {
    return null;
  }

  try {
    const startsAtDate = Temporal.PlainDate.from(event.startsAt.slice(0, 10));

    if (event.isFullDay) {
      const endsAtDate = isDefined(event.endsAt)
        ? Temporal.PlainDate.from(event.endsAt.slice(0, 10))
        : null;
      const endsAtMidnight = isDefined(event.endsAt)
        ? event.endsAt.includes('T00:00')
        : false;

      return {
        event,
        isAllDay: true,
        startDay: startsAtDate,
        endDay: isDefined(endsAtDate)
          ? getInclusiveEndDay({
              startDay: startsAtDate,
              endDay: endsAtDate,
              endsAtMidnight,
            })
          : startsAtDate,
      };
    }

    const startZonedDateTime = parseToInstantOrThrow(
      event.startsAt,
    ).toZonedDateTimeISO(timeZone);
    const endZonedDateTime = isDefined(event.endsAt)
      ? parseToInstantOrThrow(event.endsAt).toZonedDateTimeISO(timeZone)
      : startZonedDateTime;
    const startDay = startZonedDateTime.toPlainDate();
    const endDay = endZonedDateTime.toPlainDate();

    return {
      event,
      isAllDay: false,
      startDay,
      endDay: getInclusiveEndDay({
        startDay,
        endDay,
        endsAtMidnight: isMidnightInTimeZone(endZonedDateTime),
      }),
    };
  } catch {
    return null;
  }
};
