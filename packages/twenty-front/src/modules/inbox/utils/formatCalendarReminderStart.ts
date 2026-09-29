import { isNonEmptyString } from '@sniptt/guards';

// A reminder's startsAt is an ISO instant. An older producer or a corrupt
// payload may carry a non-date, so an unparseable value degrades to null and
// the row simply omits the start line instead of rendering "Invalid Date".
export const formatCalendarReminderStart = (
  startsAt: unknown,
): string | null => {
  if (!isNonEmptyString(startsAt)) {
    return null;
  }

  const startDate = new Date(startsAt);

  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  return startDate.toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};
