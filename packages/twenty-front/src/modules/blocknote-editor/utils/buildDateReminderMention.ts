import { Temporal } from 'temporal-polyfill';

import { getCalendarEventComposerDefaultDates } from '@/activities/calendar/utils/getCalendarEventComposerDefaultDates';
import { type CreateCalendarEventInput } from '~/generated-metadata/graphql';

// The chip payload; `calendarEventId` links the chip back to the Agenda event
// created for it (provenance). Serializable as-is inside the BlockNote JSON.
export type DateReminderMention = {
  calendarEventId: string;
  startsAt: string;
  label: string;
};

export type DateReminderMentionBuild = {
  // Everything but `connectedAccountId`: the caller resolves the account (the
  // provider flow owns that) so this util stays pure and unit-testable.
  calendarEventInput: Omit<CreateCalendarEventInput, 'connectedAccountId'>;
  mention: Omit<DateReminderMention, 'calendarEventId'>;
};

// The label is the chip's visible text and its export fallback, so it must be
// stable across a save/reload: formatting happens once, at build time.
const formatReminderLabel = ({
  startsAt,
  timeZone,
  locale,
}: {
  startsAt: string;
  timeZone: string;
  locale: string;
}): string =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(startsAt));

// A `/date-reminder` mention becomes an Agenda `calendarEvent` scheduled at the
// next half-hour slot (the composer's own default), so the commitment made in a
// page actually surfaces in the calendar. Reminders are not sent to guests:
// this is a local commitment, not an invitation (P4C.5 boundary).
export const buildDateReminderMention = ({
  now,
  timeZone,
  locale,
  title,
}: {
  now: Temporal.Instant;
  timeZone: string;
  locale: string;
  title?: string;
}): DateReminderMentionBuild => {
  const { startsAt, endsAt } = getCalendarEventComposerDefaultDates({
    now,
    timeZone,
  });
  const label = formatReminderLabel({ startsAt, timeZone, locale });
  const trimmedTitle = title?.trim() ?? '';

  return {
    calendarEventInput: {
      title: trimmedTitle.length > 0 ? trimmedTitle : label,
      startsAt,
      endsAt,
      isFullDay: false,
      sendInvitations: false,
      addConferencing: false,
      timeZone,
    },
    mention: { startsAt, label },
  };
};
