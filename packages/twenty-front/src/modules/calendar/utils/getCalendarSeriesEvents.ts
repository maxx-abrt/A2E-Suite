import { isNonEmptyString } from '@sniptt/guards';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { getCalendarEventSeriesId } from '@/calendar/utils/getCalendarEventSeriesId';

export type CalendarSeriesEvents = {
  anchorEvent: CalendarEventRecord | null;
  detachedEvents: CalendarEventRecord[];
};

// The stored rows of the series `event` belongs to: the anchor carrying the rule
// and every detached sibling naming the day it replaces. The scope planners must
// see every detached sibling, otherwise a second "this occurrence" edit on the
// same day would create a duplicate detached row instead of updating it.
export const getCalendarSeriesEvents = ({
  event,
  events,
}: {
  event: CalendarEventRecord;
  events: CalendarEventRecord[];
}): CalendarSeriesEvents => {
  const seriesId = getCalendarEventSeriesId(event);

  if (seriesId === null) {
    return { anchorEvent: null, detachedEvents: [] };
  }

  const seriesEvents = events.filter(
    (candidate) =>
      candidate.id === event.id ||
      getCalendarEventSeriesId(candidate) === seriesId,
  );

  return {
    anchorEvent:
      seriesEvents.find(
        (candidate) =>
          isNonEmptyString(candidate.recurrenceRule) &&
          !isNonEmptyString(candidate.recurrenceOccurrenceDay),
      ) ?? null,
    detachedEvents: seriesEvents.filter((candidate) =>
      isNonEmptyString(candidate.recurrenceOccurrenceDay),
    ),
  };
};
