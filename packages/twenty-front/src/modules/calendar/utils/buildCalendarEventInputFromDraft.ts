import { Temporal } from 'temporal-polyfill';
import { parseToInstantOrThrow } from 'twenty-shared/utils';

import { CALENDAR_MIN_EVENT_MINUTES } from '@/calendar/constants/CalendarMinEventMinutes';
import {
  type CalendarEventDraft,
  type CalendarEventInput,
} from '@/calendar/types/CalendarEventDraft';
import { buildCalendarEventInstant } from '@/calendar/utils/buildCalendarEventInstant';

const toUtcMidnightInstant = (plainDate: Temporal.PlainDate): string =>
  Temporal.ZonedDateTime.from({
    timeZone: 'UTC',
    year: plainDate.year,
    month: plainDate.month,
    day: plainDate.day,
    hour: 0,
    minute: 0,
  })
    .toInstant()
    .toString();

const nullIfBlank = (value: string): string | null =>
  value.length > 0 ? value : null;

// Draft -> mutation input. All-day events are anchored to UTC midnight and use an
// exclusive next-midnight end, the convention the calendar reader already
// collapses back to a single day.
export const buildCalendarEventInputFromDraft = ({
  draft,
  timeZone,
}: {
  draft: CalendarEventDraft;
  timeZone: string;
}): CalendarEventInput => {
  if (draft.isFullDay) {
    return {
      title: nullIfBlank(draft.title.trim()),
      description: nullIfBlank(draft.description.trim()),
      location: nullIfBlank(draft.location.trim()),
      startsAt: toUtcMidnightInstant(draft.startDay),
      endsAt: toUtcMidnightInstant(draft.endDay.add({ days: 1 })),
      isFullDay: true,
      isCanceled: draft.isCanceled,
    };
  }

  const startsAt = buildCalendarEventInstant({
    slot: {
      day: draft.startDay,
      hour: draft.startHour,
      minute: draft.startMinute,
    },
    timeZone,
  });

  let endsAt = buildCalendarEventInstant({
    slot: {
      day: draft.endDay,
      hour: draft.endHour,
      minute: draft.endMinute,
    },
    timeZone,
  });

  if (
    Temporal.Instant.compare(
      parseToInstantOrThrow(endsAt),
      parseToInstantOrThrow(startsAt),
    ) <= 0
  ) {
    endsAt = parseToInstantOrThrow(startsAt)
      .add({ minutes: CALENDAR_MIN_EVENT_MINUTES })
      .toString();
  }

  return {
    title: nullIfBlank(draft.title.trim()),
    description: nullIfBlank(draft.description.trim()),
    location: nullIfBlank(draft.location.trim()),
    startsAt,
    endsAt,
    isFullDay: false,
    isCanceled: draft.isCanceled,
  };
};
