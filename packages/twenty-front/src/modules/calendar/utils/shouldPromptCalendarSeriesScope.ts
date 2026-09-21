import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { type CalendarViewMode } from '@/calendar/types/CalendarViewMode';
import { isCalendarLocalEditSurface } from '@/calendar/utils/isCalendarLocalEditSurface';
import { isCalendarRecurringEvent } from '@/calendar/utils/isCalendarRecurringEvent';

// The single decision behind the this-occurrence/whole-series dialog: only a
// recurring event edited from an editing surface prompts. A plain event edits
// directly, and a read-only surface (week/month) never opens the dialog.
export const shouldPromptCalendarSeriesScope = ({
  event,
  viewMode,
}: {
  event: CalendarEventRecord;
  viewMode: CalendarViewMode;
}): boolean =>
  isCalendarLocalEditSurface(viewMode) && isCalendarRecurringEvent(event);
