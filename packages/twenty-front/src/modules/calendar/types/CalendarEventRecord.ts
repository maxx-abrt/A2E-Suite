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
};
