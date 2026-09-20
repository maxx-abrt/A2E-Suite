// Events carry no color column in the standard metadata, so each event gets a
// stable accent derived from its id. The page maps the index onto theme colors,
// which keeps contrast in both light and dark themes.
export const CALENDAR_EVENT_COLOR_COUNT = 8;

export const getCalendarEventColorIndex = (eventId: string): number => {
  let hash = 0;

  for (let index = 0; index < eventId.length; index++) {
    hash = (hash * 31 + eventId.charCodeAt(index)) % 1000003;
  }

  return hash % CALENDAR_EVENT_COLOR_COUNT;
};
