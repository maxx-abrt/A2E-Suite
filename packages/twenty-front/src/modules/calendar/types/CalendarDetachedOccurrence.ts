import { type CalendarEventInput } from '@/calendar/types/CalendarEventDraft';

// A "this occurrence" edit: the occurrence keeps its deterministic identity but
// is replaced by its own event payload. `event` reuses the create/edit write
// shape so the persistence slice stores a detached occurrence through the same
// path as a standalone event instead of inventing a second payload type.
export type CalendarDetachedOccurrence = {
  occurrenceId: string;
  occurrenceDay: string;
  event: CalendarEventInput;
};
