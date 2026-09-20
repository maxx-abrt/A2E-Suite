import { type Temporal } from 'temporal-polyfill';

import { type CalendarViewMode } from '@/calendar/types/CalendarViewMode';
import { getCalendarViewDays } from '@/calendar/utils/getCalendarViewDays';

export const getCalendarViewRange = ({
  mode,
  anchorDate,
  weekStartsOnDayIndex,
}: {
  mode: CalendarViewMode;
  anchorDate: Temporal.PlainDate;
  weekStartsOnDayIndex: number | null | undefined;
}): { firstDay: Temporal.PlainDate; lastDay: Temporal.PlainDate } => {
  const { firstDay, lastDay } = getCalendarViewDays({
    mode,
    anchorDate,
    weekStartsOnDayIndex,
  });

  return { firstDay, lastDay };
};
