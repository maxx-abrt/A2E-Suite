import { CALENDAR_EVENT_ACCENT_COLORS } from '@/calendar/constants/CalendarEventAccentColors';
import { getCalendarEventColorIndex } from '@/calendar/utils/getCalendarEventColorIndex';

export const getCalendarEventAccentColor = (eventId: string): string =>
  CALENDAR_EVENT_ACCENT_COLORS[getCalendarEventColorIndex(eventId)];
