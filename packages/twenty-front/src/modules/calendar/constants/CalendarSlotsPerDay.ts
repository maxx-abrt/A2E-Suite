import { CALENDAR_DAY_MINUTES } from '@/calendar/constants/CalendarDayMinutes';
import { CALENDAR_SLOT_MINUTES } from '@/calendar/constants/CalendarSlotMinutes';

export const CALENDAR_SLOTS_PER_DAY =
  CALENDAR_DAY_MINUTES / CALENDAR_SLOT_MINUTES;
