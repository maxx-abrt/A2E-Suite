import { type Temporal } from 'temporal-polyfill';

import { type CalendarViewMode } from '@/calendar/types/CalendarViewMode';

export type CalendarNavigationDirection = 'previous' | 'next';

export const navigateCalendarAnchor = ({
  mode,
  anchorDate,
  direction,
}: {
  mode: CalendarViewMode;
  anchorDate: Temporal.PlainDate;
  direction: CalendarNavigationDirection;
}): Temporal.PlainDate => {
  const delta = direction === 'previous' ? -1 : 1;

  switch (mode) {
    case 'day':
      return anchorDate.add({ days: delta });
    case 'week':
      return anchorDate.add({ weeks: delta });
    case 'month':
    case 'agenda':
      return anchorDate.add({ months: delta });
  }
};
