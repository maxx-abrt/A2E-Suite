import { Temporal } from 'temporal-polyfill';
import { isDefined, parseToInstantOrThrow } from 'twenty-shared/utils';

import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';
import { getCalendarEventSpan } from '@/calendar/utils/getCalendarEventSpan';

export const compareCalendarEventSpans = (
  spanA: CalendarEventSpan,
  spanB: CalendarEventSpan,
): number => {
  // All-day events stay above timed events on every day they cover.
  if (spanA.isAllDay !== spanB.isAllDay) {
    return spanA.isAllDay ? -1 : 1;
  }

  if (!spanA.isAllDay) {
    const startA = isDefined(spanA.event.startsAt)
      ? parseToInstantOrThrow(spanA.event.startsAt)
      : null;
    const startB = isDefined(spanB.event.startsAt)
      ? parseToInstantOrThrow(spanB.event.startsAt)
      : null;

    if (isDefined(startA) && isDefined(startB)) {
      const instantComparison = Temporal.Instant.compare(startA, startB);

      if (instantComparison !== 0) {
        return instantComparison;
      }
    }
  }

  return (spanA.event.title ?? '').localeCompare(spanB.event.title ?? '');
};

export const groupCalendarEventsByDay = ({
  events,
  timeZone,
  firstDay,
  lastDay,
}: {
  events: Parameters<typeof getCalendarEventSpan>[0][];
  timeZone: string;
  firstDay: Temporal.PlainDate;
  lastDay: Temporal.PlainDate;
}): Map<string, CalendarEventSpan[]> => {
  const spansByDay = new Map<string, CalendarEventSpan[]>();

  events.forEach((event) => {
    const span = getCalendarEventSpan(event, timeZone);

    if (!isDefined(span)) {
      return;
    }

    if (
      Temporal.PlainDate.compare(span.endDay, firstDay) === -1 ||
      Temporal.PlainDate.compare(span.startDay, lastDay) === 1
    ) {
      return;
    }

    let day =
      Temporal.PlainDate.compare(span.startDay, firstDay) === -1
        ? firstDay
        : span.startDay;
    const clippedEndDay =
      Temporal.PlainDate.compare(span.endDay, lastDay) === 1
        ? lastDay
        : span.endDay;

    while (Temporal.PlainDate.compare(day, clippedEndDay) <= 0) {
      const dayKey = day.toString();
      const daySpans = spansByDay.get(dayKey) ?? [];

      daySpans.push(span);
      spansByDay.set(dayKey, daySpans);
      day = day.add({ days: 1 });
    }
  });

  spansByDay.forEach((daySpans) => {
    daySpans.sort(compareCalendarEventSpans);
  });

  return spansByDay;
};
