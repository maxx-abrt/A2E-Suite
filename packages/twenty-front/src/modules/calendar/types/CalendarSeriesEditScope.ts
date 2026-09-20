// The explicit choice a calendar user makes when editing or deleting a
// recurring event: touch only the occurrence they clicked, or the whole series.
// `this-occurrence` materializes a per-occurrence exception; `whole-series`
// replaces/removes the series itself. There is deliberately no `future` scope:
// future-series split is not promised without an additional product decision.
export type CalendarSeriesEditScope = 'this-occurrence' | 'whole-series';

export const CALENDAR_SERIES_EDIT_SCOPES: CalendarSeriesEditScope[] = [
  'this-occurrence',
  'whole-series',
];
