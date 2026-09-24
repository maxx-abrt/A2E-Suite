import { isNonEmptyString } from '@sniptt/guards';
import { type Temporal } from 'temporal-polyfill';
import { isDefined, parseToInstantOrThrow } from 'twenty-shared/utils';

import { type CalendarEventOccurrenceSource } from '@/calendar/types/CalendarEventOccurrenceSource';
import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { buildCalendarOccurrenceId } from '@/calendar/utils/buildCalendarOccurrenceId';
import { expandCalendarRecurrence } from '@/calendar/utils/expandCalendarRecurrence';
import { getCalendarEventSeriesId } from '@/calendar/utils/getCalendarEventSeriesId';
import { parseCalendarRecurrenceRule } from '@/calendar/utils/parseCalendarRecurrenceRule';
import { parseCalendarSkippedOccurrenceDays } from '@/calendar/utils/parseCalendarSkippedOccurrenceDays';

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

// All-day rows are anchored to UTC midnight (buildCalendarEventInputFromDraft),
// so they must expand in UTC: expanding them in a zone west of UTC would move
// every occurrence onto the previous day.
const ALL_DAY_SERIES_TIME_ZONE = 'UTC';

export type CalendarExpandedEvents = {
  events: CalendarEventRecord[];
  occurrenceSourceByEventId: Map<string, CalendarEventOccurrenceSource>;
};

const isCalendarSeriesAnchor = (event: CalendarEventRecord): boolean =>
  isNonEmptyString(event.recurrenceRule) &&
  !isNonEmptyString(event.recurrenceOccurrenceDay);

const collectDetachedDaysBySeriesId = (
  events: CalendarEventRecord[],
): Map<string, Set<string>> => {
  const detachedDaysBySeriesId = new Map<string, Set<string>>();

  events.forEach((event) => {
    if (
      !isNonEmptyString(event.recurrenceSeriesId) ||
      !isNonEmptyString(event.recurrenceOccurrenceDay)
    ) {
      return;
    }

    const detachedDays =
      detachedDaysBySeriesId.get(event.recurrenceSeriesId) ?? new Set();

    detachedDays.add(event.recurrenceOccurrenceDay);
    detachedDaysBySeriesId.set(event.recurrenceSeriesId, detachedDays);
  });

  return detachedDaysBySeriesId;
};

// Returns null when the anchor cannot be expanded (no start, unparseable rule,
// unknown time zone): the caller then renders the stored row as before rather
// than dropping the series from the calendar.
const expandCalendarSeriesAnchor = ({
  anchorEvent,
  detachedDays,
  timeZone,
  firstDay,
  lastDay,
  weekStartsOnDayIndex,
}: {
  anchorEvent: CalendarEventRecord;
  detachedDays: Set<string>;
  timeZone: string;
  firstDay: Temporal.PlainDate;
  lastDay: Temporal.PlainDate;
  weekStartsOnDayIndex?: number | null;
}):
  | {
      occurrenceEvent: CalendarEventRecord;
      occurrenceDay: string;
    }[]
  | null => {
  if (
    !isDefined(anchorEvent.startsAt) ||
    !isNonEmptyString(anchorEvent.recurrenceRule)
  ) {
    return null;
  }

  const rule = parseCalendarRecurrenceRule(anchorEvent.recurrenceRule);
  const seriesId = getCalendarEventSeriesId(anchorEvent);

  if (rule === null || seriesId === null) {
    return null;
  }

  try {
    const seriesStartInstant = parseToInstantOrThrow(anchorEvent.startsAt);
    const seriesEndInstant = isDefined(anchorEvent.endsAt)
      ? parseToInstantOrThrow(anchorEvent.endsAt)
      : seriesStartInstant;
    const durationMilliseconds = Math.max(
      0,
      seriesEndInstant.epochMilliseconds - seriesStartInstant.epochMilliseconds,
    );
    const seriesTimeZone = anchorEvent.isFullDay
      ? ALL_DAY_SERIES_TIME_ZONE
      : isNonEmptyString(anchorEvent.recurrenceTimezone)
        ? anchorEvent.recurrenceTimezone
        : timeZone;

    // Open the window one event duration (plus a day of zone skew) before the
    // first visible day so a multi-day occurrence that started earlier still
    // shows; groupCalendarEventsByDay clips whatever falls outside the grid.
    const leadingDays =
      Math.ceil(durationMilliseconds / MILLISECONDS_IN_DAY) + 1;
    const rangeStart = firstDay
      .subtract({ days: leadingDays })
      .toZonedDateTime({ timeZone: seriesTimeZone })
      .toInstant()
      .toString();
    const rangeEnd = lastDay
      .add({ days: 2 })
      .toZonedDateTime({ timeZone: seriesTimeZone })
      .toInstant()
      .toString();

    const occurrences = expandCalendarRecurrence({
      rule,
      seriesStart: seriesStartInstant.toString(),
      rangeStart,
      rangeEnd,
      timeZone: seriesTimeZone,
      weekStartsOnDayIndex,
    });

    const skippedDays = new Set(
      parseCalendarSkippedOccurrenceDays(
        anchorEvent.recurrenceSkippedOccurrenceDays,
      ),
    );

    return occurrences
      .filter(
        (occurrence) =>
          !skippedDays.has(occurrence.day) && !detachedDays.has(occurrence.day),
      )
      .map((occurrence) => {
        const occurrenceStartInstant = parseToInstantOrThrow(
          occurrence.startsAt,
        );

        return {
          occurrenceDay: occurrence.day,
          occurrenceEvent: {
            ...anchorEvent,
            id: buildCalendarOccurrenceId({
              seriesId,
              occurrenceDay: occurrence.day,
            }),
            startsAt: occurrenceStartInstant.toString(),
            endsAt: occurrenceStartInstant
              .add({ milliseconds: durationMilliseconds })
              .toString(),
          },
        };
      });
  } catch {
    return null;
  }
};

// View-level recurrence expansion: every stored series anchor is replaced by the
// occurrences its rule produces around [firstDay, lastDay], minus the skipped
// days and the days a detached sibling row replaces (that row renders itself).
// Occurrences carry the deterministic occurrence id, so a selection survives a
// refetch, and `occurrenceSourceByEventId` maps each one back to its stored
// anchor for the scope planners. Plain and detached rows pass through untouched.
export const expandCalendarEventsForRange = ({
  events,
  timeZone,
  firstDay,
  lastDay,
  weekStartsOnDayIndex,
}: {
  events: CalendarEventRecord[];
  timeZone: string;
  firstDay: Temporal.PlainDate;
  lastDay: Temporal.PlainDate;
  weekStartsOnDayIndex?: number | null;
}): CalendarExpandedEvents => {
  const occurrenceSourceByEventId = new Map<
    string,
    CalendarEventOccurrenceSource
  >();
  const detachedDaysBySeriesId = collectDetachedDaysBySeriesId(events);

  const expandedEvents = events.flatMap((event) => {
    if (!isCalendarSeriesAnchor(event)) {
      return [event];
    }

    const seriesId = getCalendarEventSeriesId(event);
    const expandedOccurrences = expandCalendarSeriesAnchor({
      anchorEvent: event,
      detachedDays:
        (isDefined(seriesId) ? detachedDaysBySeriesId.get(seriesId) : null) ??
        new Set(),
      timeZone,
      firstDay,
      lastDay,
      weekStartsOnDayIndex,
    });

    if (expandedOccurrences === null) {
      return [event];
    }

    return expandedOccurrences.map(({ occurrenceEvent, occurrenceDay }) => {
      occurrenceSourceByEventId.set(occurrenceEvent.id, {
        anchorEventId: event.id,
        occurrenceDay,
      });

      return occurrenceEvent;
    });
  });

  return { events: expandedEvents, occurrenceSourceByEventId };
};
