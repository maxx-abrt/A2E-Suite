import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';

// A recurrence series is its stable identity plus the rule that expands it.
// `seriesStart` is the DTSTART instant; it is carried beside the rule (not
// inside it) to match expandCalendarRecurrence's signature, and it may move on a
// whole-series edit without changing the series or occurrence identities.
export type CalendarRecurrenceSeries = {
  seriesId: string;
  seriesStart: string;
  rule: CalendarRecurrenceRule;
};
