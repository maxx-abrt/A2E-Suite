import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { type CalendarDetachedOccurrence } from '@/calendar/types/CalendarDetachedOccurrence';
import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { type CalendarRecurrenceSeriesState } from '@/calendar/types/CalendarRecurrenceSeriesState';
import { buildCalendarEventInputFromRecord } from '@/calendar/utils/buildCalendarEventInputFromRecord';
import { buildCalendarOccurrenceId } from '@/calendar/utils/buildCalendarOccurrenceId';
import { buildCalendarSeriesId } from '@/calendar/utils/buildCalendarSeriesId';
import { compareCalendarOccurrenceIds } from '@/calendar/utils/compareCalendarOccurrenceIds';
import { parseCalendarRecurrenceRule } from '@/calendar/utils/parseCalendarRecurrenceRule';
import { parseCalendarSkippedOccurrenceDays } from '@/calendar/utils/parseCalendarSkippedOccurrenceDays';

// Rebuilds the pure series state from the stored rows so the scope dispatchers
// (applyCalendarEventEdit/Delete) can run on exactly the state the persistence
// layer already holds. Returns null when the anchor is not a valid series (no
// rule, no start, or an unparseable rule) — callers then fall back to the plain
// single-event path.
export const buildCalendarRecurrenceSeriesStateFromEvents = ({
  anchorEvent,
  detachedEvents,
}: {
  anchorEvent: CalendarEventRecord;
  detachedEvents: CalendarEventRecord[];
}): CalendarRecurrenceSeriesState | null => {
  if (!isDefined(anchorEvent.startsAt)) {
    return null;
  }

  if (!isNonEmptyString(anchorEvent.recurrenceRule)) {
    return null;
  }

  const rule = parseCalendarRecurrenceRule(anchorEvent.recurrenceRule);

  if (rule === null) {
    return null;
  }

  const seriesId = isNonEmptyString(anchorEvent.recurrenceSeriesId)
    ? anchorEvent.recurrenceSeriesId
    : buildCalendarSeriesId({ seriesAnchorEventId: anchorEvent.id });

  const skippedOccurrenceIds = parseCalendarSkippedOccurrenceDays(
    anchorEvent.recurrenceSkippedOccurrenceDays,
  )
    .map((occurrenceDay) =>
      buildCalendarOccurrenceId({ seriesId, occurrenceDay }),
    )
    .sort(compareCalendarOccurrenceIds);

  const detachedOccurrences = detachedEvents
    .map((detachedEvent): CalendarDetachedOccurrence | null => {
      if (!isNonEmptyString(detachedEvent.recurrenceOccurrenceDay)) {
        return null;
      }

      const event = buildCalendarEventInputFromRecord(detachedEvent);

      if (event === null) {
        return null;
      }

      return {
        occurrenceId: buildCalendarOccurrenceId({
          seriesId,
          occurrenceDay: detachedEvent.recurrenceOccurrenceDay,
        }),
        occurrenceDay: detachedEvent.recurrenceOccurrenceDay,
        event,
      };
    })
    .filter(isDefined)
    .sort((left, right) =>
      compareCalendarOccurrenceIds(left.occurrenceId, right.occurrenceId),
    );

  return {
    series: {
      seriesId,
      seriesStart: anchorEvent.startsAt,
      rule,
    },
    skippedOccurrenceIds,
    detachedOccurrences,
  };
};
