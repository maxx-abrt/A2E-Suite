import { type CalendarDetachedOccurrence } from '@/calendar/types/CalendarDetachedOccurrence';
import { type CalendarRecurrenceSeries } from '@/calendar/types/CalendarRecurrenceSeries';

// Pure, persistence-free state of one series: the rule plus the per-occurrence
// exceptions the user materialized. `skippedOccurrenceIds` are "this occurrence"
// deletes; `detachedOccurrences` are "this occurrence" edits. Both are keyed by
// the deterministic occurrence id and kept unique + sorted, so the state has one
// canonical form and materializing the same exception twice is idempotent.
// Nothing here is persisted or rendered yet — P4C.3c defines the model only.
export type CalendarRecurrenceSeriesState = {
  series: CalendarRecurrenceSeries;
  skippedOccurrenceIds: string[];
  detachedOccurrences: CalendarDetachedOccurrence[];
};
