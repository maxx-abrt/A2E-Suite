import { isDefined } from 'twenty-shared/utils';

import { type CalendarEventDraft } from '@/calendar/types/CalendarEventDraft';
import { buildCalendarRecurrenceRuleFromDraft } from '@/calendar/utils/buildCalendarRecurrenceRuleFromDraft';
import { buildCalendarSeriesId } from '@/calendar/utils/buildCalendarSeriesId';
import { serializeCalendarRecurrenceRule } from '@/calendar/utils/serializeCalendarRecurrenceRule';

// All-day rows are stored at UTC midnight, so their series expands in UTC on
// both the front and the server stored path; timed series keep the author's
// zone so a 09:00 series stays at 09:00 across DST.
export const getCalendarSeriesTimeZone = ({
  isFullDay,
  timeZone,
}: {
  isFullDay: boolean;
  timeZone: string;
}): string => (isFullDay ? 'UTC' : timeZone);

export type CalendarSeriesAnchorInput = {
  recurrenceRule: string;
  recurrenceTimezone: string;
  recurrenceSeriesId: string;
  recurrenceOccurrenceDay: null;
};

// The recurrence columns that turn a saved event into a series anchor. The
// series id is derived from the anchor's own record id — the create path
// pre-generates it — so detached rows written later resolve the same series.
// Returns null when the draft does not repeat.
export const buildCalendarSeriesAnchorInputFromDraft = ({
  draft,
  timeZone,
  seriesAnchorEventId,
}: {
  draft: CalendarEventDraft;
  timeZone: string;
  seriesAnchorEventId: string;
}): CalendarSeriesAnchorInput | null => {
  if (!isDefined(draft.recurrence)) {
    return null;
  }

  const seriesTimeZone = getCalendarSeriesTimeZone({
    isFullDay: draft.isFullDay,
    timeZone,
  });

  return {
    recurrenceRule: serializeCalendarRecurrenceRule(
      buildCalendarRecurrenceRuleFromDraft({
        recurrence: draft.recurrence,
        startDay: draft.startDay,
        seriesTimeZone,
      }),
    ),
    recurrenceTimezone: seriesTimeZone,
    recurrenceSeriesId: buildCalendarSeriesId({ seriesAnchorEventId }),
    recurrenceOccurrenceDay: null,
  };
};
