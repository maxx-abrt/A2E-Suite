import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CALENDAR_EVENT_COLOR_COUNT } from '@/calendar/utils/getCalendarEventColorIndex';

// Theme variables, not literals, so the accents stay legible in light and dark.
export const CALENDAR_EVENT_ACCENT_COLORS = [
  themeCssVariables.color.blue,
  themeCssVariables.color.green,
  themeCssVariables.color.purple,
  themeCssVariables.color.orange,
  themeCssVariables.color.turquoise,
  themeCssVariables.color.red,
  themeCssVariables.color.yellow,
  themeCssVariables.color.jade,
].slice(0, CALENDAR_EVENT_COLOR_COUNT);
