import { type Temporal } from 'temporal-polyfill';

// Editable form state for a local event. Times are kept as day + hour/minute so
// a DST change between save and edit never silently shifts the wall-clock time.
export type CalendarEventDraft = {
  title: string;
  description: string;
  location: string;
  isFullDay: boolean;
  isCanceled: boolean;
  startDay: Temporal.PlainDate;
  startHour: number;
  startMinute: number;
  endDay: Temporal.PlainDate;
  endHour: number;
  endMinute: number;
};

export type CalendarEventInput = {
  title: string | null;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  isFullDay: boolean;
  isCanceled: boolean;
  // Recurrence columns. Optional so the plain create/edit path (US-050/052)
  // stays source-compatible; a scoped recurrence write sets them explicitly.
  recurrenceRule?: string | null;
  recurrenceTimezone?: string | null;
  recurrenceSeriesId?: string | null;
  recurrenceOccurrenceDay?: string | null;
  recurrenceSkippedOccurrenceDays?: string | null;
};
