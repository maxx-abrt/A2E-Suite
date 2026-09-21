// The subset of the standard `calendarEvent` object the page renders. Provider
// synced records and local (channel-less) records share this shape because the
// shadow-read visibility filter decides what the API returns, not the shape.
export type CalendarEventRecord = {
  id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isFullDay: boolean;
  isCanceled: boolean;
  // Provider-synced rows carry external timestamps; local (channel-less) rows
  // created through the standard record path do not. This is the read-only gate.
  externalCreatedAt: string | null;
  // Recurrence columns added by the 2-39 workspace command. A plain event leaves
  // all five null; a series anchor carries a rule + series id; a detached
  // occurrence shares the series id and names the day it replaces. This is the
  // shape the this-occurrence/whole-series scope dialog keys off.
  recurrenceRule: string | null;
  recurrenceTimezone: string | null;
  recurrenceSeriesId: string | null;
  recurrenceOccurrenceDay: string | null;
  recurrenceSkippedOccurrenceDays: string | null;
};
