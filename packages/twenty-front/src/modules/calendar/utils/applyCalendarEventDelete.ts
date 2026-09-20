import { type CalendarRecurrenceSeriesState } from '@/calendar/types/CalendarRecurrenceSeriesState';
import { skipCalendarOccurrence } from '@/calendar/utils/skipCalendarOccurrence';

// Scope dispatcher for a delete, mirroring the "this occurrence / whole series"
// dialog. "this occurrence" materializes an exclusion (skipped) and also drops
// any detached replacement for that occurrence. "whole series" removes the
// series entirely, so it returns null: the persistence slice deletes the anchor
// record and there is no series state left to carry. Deleting an occurrence that
// is already skipped returns the same state, so a retried delete is idempotent.
export const applyCalendarEventDelete = (
  input: { state: CalendarRecurrenceSeriesState } & (
    | { scope: 'this-occurrence'; occurrenceId: string }
    | { scope: 'whole-series' }
  ),
): CalendarRecurrenceSeriesState | null => {
  if (input.scope === 'whole-series') {
    return null;
  }

  return skipCalendarOccurrence({
    state: input.state,
    occurrenceId: input.occurrenceId,
  });
};
