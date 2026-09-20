import { isDefined, parseToInstantOrThrow } from 'twenty-shared/utils';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';

export const formatCalendarEventTime = ({
  event,
  timeZone,
  locale,
}: {
  event: CalendarEventRecord;
  timeZone: string;
  locale?: string;
}): string => {
  if (!isDefined(event.startsAt)) {
    return '';
  }

  try {
    const start = parseToInstantOrThrow(event.startsAt).toZonedDateTimeISO(
      timeZone,
    );
    const startLabel = start.toLocaleString(locale, { timeStyle: 'short' });

    if (!isDefined(event.endsAt)) {
      return startLabel;
    }

    const end = parseToInstantOrThrow(event.endsAt).toZonedDateTimeISO(
      timeZone,
    );

    return `${startLabel} – ${end.toLocaleString(locale, {
      timeStyle: 'short',
    })}`;
  } catch {
    return '';
  }
};
