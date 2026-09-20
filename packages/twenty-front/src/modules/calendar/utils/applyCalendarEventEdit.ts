import { type CalendarEventInput } from '@/calendar/types/CalendarEventDraft';
import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import { type CalendarRecurrenceSeriesState } from '@/calendar/types/CalendarRecurrenceSeriesState';
import { detachCalendarOccurrence } from '@/calendar/utils/detachCalendarOccurrence';

// Scope dispatcher for an edit, mirroring the "this occurrence / whole series"
// dialog. "this occurrence" materializes a detached replacement; "whole series"
// swaps the rule and (optionally) DTSTART for the whole series.
//
// A whole-series edit PRESERVES already-materialized exceptions: a detached
// occurrence is a real event and an exclusion is keyed by day, so silently
// dropping them would lose user data. Occurrence identity is unchanged by a
// whole-series edit because it is derived from the series id + day, never from
// the rule. Future-series split is not implemented (extra product decision).
export const applyCalendarEventEdit = (
  input: { state: CalendarRecurrenceSeriesState } & (
    | {
        scope: 'this-occurrence';
        occurrenceId: string;
        occurrenceDay: string;
        event: CalendarEventInput;
      }
    | {
        scope: 'whole-series';
        rule: CalendarRecurrenceRule;
        seriesStart?: string;
      }
  ),
): CalendarRecurrenceSeriesState => {
  if (input.scope === 'this-occurrence') {
    return detachCalendarOccurrence({
      state: input.state,
      detachedOccurrence: {
        occurrenceId: input.occurrenceId,
        occurrenceDay: input.occurrenceDay,
        event: input.event,
      },
    });
  }

  return {
    ...input.state,
    series: {
      seriesId: input.state.series.seriesId,
      seriesStart: input.seriesStart ?? input.state.series.seriesStart,
      rule: input.rule,
    },
  };
};
