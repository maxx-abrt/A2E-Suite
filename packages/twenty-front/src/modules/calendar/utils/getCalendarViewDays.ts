import { type Temporal } from 'temporal-polyfill';
import { ViewCalendarLayout } from '~/generated-metadata/graphql';

import { type CalendarViewMode } from '@/calendar/types/CalendarViewMode';
import { normalizeWeekStartDay } from '@/calendar/utils/normalizeWeekStartDay';
import { getRecordCalendarDaysRange } from '@/object-record/record-calendar/utils/getRecordCalendarDaysRange';

// The page reuses the record-calendar grid primitive so day/week/month keep the
// same week-start and month-padding rules as the object calendar view.
const VIEW_MODE_TO_CALENDAR_LAYOUT: Record<
  CalendarViewMode,
  ViewCalendarLayout
> = {
  day: ViewCalendarLayout.DAY,
  week: ViewCalendarLayout.WEEK,
  month: ViewCalendarLayout.MONTH,
  // Agenda is a list over the same month range: there is no agenda layout.
  agenda: ViewCalendarLayout.MONTH,
};

export const getCalendarViewDays = ({
  mode,
  anchorDate,
  weekStartsOnDayIndex,
}: {
  mode: CalendarViewMode;
  anchorDate: Temporal.PlainDate;
  weekStartsOnDayIndex: number | null | undefined;
}) =>
  getRecordCalendarDaysRange({
    selectedDate: anchorDate,
    calendarLayout: VIEW_MODE_TO_CALENDAR_LAYOUT[mode],
    weekStartsOnDayIndex: normalizeWeekStartDay(weekStartsOnDayIndex),
  });
