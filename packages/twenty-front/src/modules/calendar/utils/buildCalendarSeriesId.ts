// Stable series identity, derived from the anchor (master) event's id — the one
// value that must survive every later occurrence, rule or time edit. The prefix
// namespaces the derived id so it can never collide with a plain event id when
// the persistence slice stores it next to real records.
export const buildCalendarSeriesId = ({
  seriesAnchorEventId,
}: {
  seriesAnchorEventId: string;
}): string => `calendar-series#${seriesAnchorEventId}`;
