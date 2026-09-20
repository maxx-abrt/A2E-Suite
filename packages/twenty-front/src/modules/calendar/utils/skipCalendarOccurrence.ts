import { type CalendarRecurrenceSeriesState } from '@/calendar/types/CalendarRecurrenceSeriesState';
import { compareCalendarOccurrenceIds } from '@/calendar/utils/compareCalendarOccurrenceIds';

// "This occurrence" delete. Materializes an exclusion: the occurrence id is
// recorded so a later expansion drops it. Any detached replacement for the same
// occurrence is removed — deleting the occurrence supersedes an earlier edit —
// which keeps the two exception lists mutually exclusive. Re-deleting the same
// occurrence is a no-op, so a retried delete never appends a duplicate.
export const skipCalendarOccurrence = ({
  state,
  occurrenceId,
}: {
  state: CalendarRecurrenceSeriesState;
  occurrenceId: string;
}): CalendarRecurrenceSeriesState => {
  if (state.skippedOccurrenceIds.includes(occurrenceId)) {
    return state;
  }

  return {
    ...state,
    skippedOccurrenceIds: [...state.skippedOccurrenceIds, occurrenceId].sort(
      compareCalendarOccurrenceIds,
    ),
    detachedOccurrences: state.detachedOccurrences.filter(
      (detachedOccurrence) => detachedOccurrence.occurrenceId !== occurrenceId,
    ),
  };
};
