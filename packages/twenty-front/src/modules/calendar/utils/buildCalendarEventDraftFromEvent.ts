import { isNonEmptyString } from '@sniptt/guards';
import { Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';

import { type CalendarEventDraft } from '@/calendar/types/CalendarEventDraft';
import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { type CalendarRecurrenceDraft } from '@/calendar/types/CalendarRecurrenceDraft';
import { buildCalendarRecurrenceDraftFromRule } from '@/calendar/utils/buildCalendarRecurrenceDraftFromRule';
import { getCalendarSeriesTimeZone } from '@/calendar/utils/buildCalendarSeriesAnchorInputFromDraft';
import { parseCalendarRecurrenceRule } from '@/calendar/utils/parseCalendarRecurrenceRule';
import { getCalendarEventSlotFromInstant } from '@/calendar/utils/getCalendarEventSlotFromInstant';
import { getCalendarEventSpan } from '@/calendar/utils/getCalendarEventSpan';

const buildRecurrenceDraftFromEvent = ({
  event,
  startDay,
  timeZone,
}: {
  event: CalendarEventRecord;
  startDay: Temporal.PlainDate;
  timeZone: string;
}): CalendarRecurrenceDraft | null => {
  if (
    !isNonEmptyString(event.recurrenceRule) ||
    isNonEmptyString(event.recurrenceOccurrenceDay)
  ) {
    return null;
  }

  const rule = parseCalendarRecurrenceRule(event.recurrenceRule);

  if (rule === null) {
    return null;
  }

  return buildCalendarRecurrenceDraftFromRule({
    rule,
    startDay,
    seriesTimeZone: event.isFullDay
      ? getCalendarSeriesTimeZone({ isFullDay: true, timeZone })
      : isNonEmptyString(event.recurrenceTimezone)
        ? event.recurrenceTimezone
        : timeZone,
  });
};

// Record -> editable draft in the user's time zone, so opening the composer on a
// DST boundary shows the same wall-clock time that was saved. A series anchor
// (or an expanded occurrence of one) also carries its rule as a "Repeat" draft.
export const buildCalendarEventDraftFromEvent = ({
  event,
  timeZone,
}: {
  event: CalendarEventRecord;
  timeZone: string;
}): CalendarEventDraft => {
  const fallbackDay = Temporal.Now.plainDateISO(timeZone);
  const span = getCalendarEventSpan(event, timeZone);

  if (event.isFullDay) {
    const startDay = span?.startDay ?? fallbackDay;

    return {
      title: event.title ?? '',
      description: event.description ?? '',
      location: event.location ?? '',
      isFullDay: true,
      isCanceled: event.isCanceled,
      startDay,
      startHour: 0,
      startMinute: 0,
      endDay: span?.endDay ?? startDay,
      endHour: 0,
      endMinute: 0,
      recurrence: buildRecurrenceDraftFromEvent({ event, startDay, timeZone }),
    };
  }

  const startSlot = isDefined(event.startsAt)
    ? getCalendarEventSlotFromInstant({
        instant: event.startsAt,
        timeZone,
      })
    : null;
  const startDay = startSlot?.day ?? fallbackDay;
  const startHour = startSlot?.hour ?? 0;
  const startMinute = startSlot?.minute ?? 0;
  const endSlot = isDefined(event.endsAt)
    ? getCalendarEventSlotFromInstant({ instant: event.endsAt, timeZone })
    : null;
  const endDateTime = isDefined(endSlot)
    ? endSlot.day.toPlainDateTime({
        hour: endSlot.hour,
        minute: endSlot.minute,
      })
    : startDay
        .toPlainDateTime({ hour: startHour, minute: startMinute })
        .add({ hours: 1 });

  return {
    title: event.title ?? '',
    description: event.description ?? '',
    location: event.location ?? '',
    isFullDay: false,
    isCanceled: event.isCanceled,
    startDay,
    startHour,
    startMinute,
    endDay: endDateTime.toPlainDate(),
    endHour: endDateTime.hour,
    endMinute: endDateTime.minute,
    recurrence: buildRecurrenceDraftFromEvent({ event, startDay, timeZone }),
  };
};
