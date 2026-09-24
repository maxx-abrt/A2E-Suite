// Where a rendered recurrence occurrence comes from: the stored anchor row whose
// rule produced it and the wall-clock day that identifies it inside the series.
// Expanded occurrences are view-only; every write still targets stored rows.
export type CalendarEventOccurrenceSource = {
  anchorEventId: string;
  occurrenceDay: string;
};
