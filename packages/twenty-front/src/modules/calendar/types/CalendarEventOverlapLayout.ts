// A timed event placed in a day column. Ratios are fractions of the full day so
// the view stays resolution-independent; `columnIndex`/`columnCount` spread
// overlapping events across readable lanes instead of stacking them.
export type CalendarEventOverlapLayout = {
  eventId: string;
  topRatio: number;
  heightRatio: number;
  columnIndex: number;
  columnCount: number;
};
