import { type CalendarViewMode } from '@/calendar/types/CalendarViewMode';

// The surfaces that expose local event editing. Week and month remain read-only
// exactly as shipped in US-052 (slot/drag creation is day-view only), so no
// scope dialog can originate there; day and agenda are the editing surfaces the
// details panel and composer serve.
export const isCalendarLocalEditSurface = (
  viewMode: CalendarViewMode,
): boolean => viewMode === 'day' || viewMode === 'agenda';
