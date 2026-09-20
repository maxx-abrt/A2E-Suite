import { isDefined, parseToInstantOrThrow } from 'twenty-shared/utils';

import { type CalendarEventSlot } from '@/calendar/types/CalendarEventSlot';

// Inverse of buildCalendarEventInstant: an instant back to the user's wall clock.
export const getCalendarEventSlotFromInstant = ({
  instant,
  timeZone,
}: {
  instant: string;
  timeZone: string;
}): CalendarEventSlot | null => {
  if (!isDefined(instant)) {
    return null;
  }

  try {
    const zonedDateTime =
      parseToInstantOrThrow(instant).toZonedDateTimeISO(timeZone);

    return {
      day: zonedDateTime.toPlainDate(),
      hour: zonedDateTime.hour,
      minute: zonedDateTime.minute,
    };
  } catch {
    return null;
  }
};
