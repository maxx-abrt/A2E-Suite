import { type CalendarDetachedOccurrence } from '@/calendar/types/CalendarDetachedOccurrence';
import { type CalendarRecurrenceSeriesState } from '@/calendar/types/CalendarRecurrenceSeriesState';
import { compareCalendarOccurrenceIds } from '@/calendar/utils/compareCalendarOccurrenceIds';

// "This occurrence" edit. Materializes an override: the occurrence id maps to
// its own replacement event. Upsert by occurrence id — materializing the same
// detached occurrence twice yields exactly one event (retry idempotence), and
// editing an already-detached occurrence replaces it instead of duplicating.
// Editing also clears any exclusion for that occurrence, so an id is never both
// skipped and detached.
export const detachCalendarOccurrence = ({
  state,
  detachedOccurrence,
}: {
  state: CalendarRecurrenceSeriesState;
  detachedOccurrence: CalendarDetachedOccurrence;
}): CalendarRecurrenceSeriesState => {
  const detachedOccurrences = state.detachedOccurrences
    .filter(
      (existing) => existing.occurrenceId !== detachedOccurrence.occurrenceId,
    )
    .concat(detachedOccurrence)
    .sort((left, right) =>
      compareCalendarOccurrenceIds(left.occurrenceId, right.occurrenceId),
    );

  return {
    ...state,
    skippedOccurrenceIds: state.skippedOccurrenceIds.filter(
      (occurrenceId) => occurrenceId !== detachedOccurrence.occurrenceId,
    ),
    detachedOccurrences,
  };
};
