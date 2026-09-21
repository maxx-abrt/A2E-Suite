import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { type CalendarEventInput } from '@/calendar/types/CalendarEventDraft';
import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import { applyCalendarEventDelete } from '@/calendar/utils/applyCalendarEventDelete';
import { applyCalendarEventEdit } from '@/calendar/utils/applyCalendarEventEdit';
import { buildCalendarOccurrenceId } from '@/calendar/utils/buildCalendarOccurrenceId';
import { buildCalendarRecurrenceSeriesStateFromEvents } from '@/calendar/utils/buildCalendarRecurrenceSeriesStateFromEvents';
import { serializeCalendarRecurrenceRule } from '@/calendar/utils/serializeCalendarRecurrenceRule';
import { serializeCalendarSkippedOccurrenceDays } from '@/calendar/utils/serializeCalendarSkippedOccurrenceDays';

// Persistence plans for the scope dialog. Each planner rebuilds the pure series
// state from the stored rows, routes the action through the matching dispatcher
// (applyCalendarEventEdit/applyCalendarEventDelete) and maps the resulting state
// back to record writes. The dispatchers own the semantics; this module only
// serializes their output, so retrying a plan is idempotent by construction.
export type CalendarAnchorUpdate = {
  id: string;
  input: Partial<CalendarEventInput>;
};

export type CalendarOccurrenceEditPlan = {
  detachedEventId: string | null;
  detachedInput: CalendarEventInput;
  anchorUpdate: CalendarAnchorUpdate | null;
};

export type CalendarSeriesEditPlan = {
  anchorId: string;
  anchorInput: CalendarEventInput;
};

export type CalendarOccurrenceDeletePlan = {
  anchorUpdate: CalendarAnchorUpdate | null;
  detachedEventId: string | null;
};

export type CalendarSeriesDeletePlan = {
  seriesDeleteIds: string[];
};

// occurrence id is `<seriesId>@<day>`; the day is what the stored exclusion
// column keeps.
const getOccurrenceDay = (occurrenceId: string, seriesId: string): string =>
  occurrenceId.slice(seriesId.length + 1);

const serializeStateSkippedDays = ({
  skippedOccurrenceIds,
  seriesId,
}: {
  skippedOccurrenceIds: string[];
  seriesId: string;
}): string =>
  serializeCalendarSkippedOccurrenceDays(
    skippedOccurrenceIds.map((occurrenceId) =>
      getOccurrenceDay(occurrenceId, seriesId),
    ),
  );

const buildAnchorSkippedDaysUpdate = ({
  anchorEvent,
  skippedOccurrenceIds,
  seriesId,
}: {
  anchorEvent: CalendarEventRecord;
  skippedOccurrenceIds: string[];
  seriesId: string;
}): CalendarAnchorUpdate | null => {
  const skippedOccurrenceDays = serializeStateSkippedDays({
    skippedOccurrenceIds,
    seriesId,
  });

  if (skippedOccurrenceDays === anchorEvent.recurrenceSkippedOccurrenceDays) {
    return null;
  }

  return {
    id: anchorEvent.id,
    input: { recurrenceSkippedOccurrenceDays: skippedOccurrenceDays },
  };
};

const findDetachedEventId = ({
  detachedEvents,
  occurrenceDay,
}: {
  detachedEvents: CalendarEventRecord[];
  occurrenceDay: string;
}): string | null =>
  detachedEvents.find(
    (detachedEvent) => detachedEvent.recurrenceOccurrenceDay === occurrenceDay,
  )?.id ?? null;

// "This occurrence" edit: materialize (upsert) the detached replacement and
// clear any exclusion for that day on the anchor.
export const planCalendarOccurrenceEdit = ({
  anchorEvent,
  detachedEvents,
  occurrenceDay,
  eventInput,
}: {
  anchorEvent: CalendarEventRecord;
  detachedEvents: CalendarEventRecord[];
  occurrenceDay: string;
  eventInput: CalendarEventInput;
}): CalendarOccurrenceEditPlan | null => {
  const state = buildCalendarRecurrenceSeriesStateFromEvents({
    anchorEvent,
    detachedEvents,
  });

  if (state === null) {
    return null;
  }

  const seriesId = state.series.seriesId;
  const occurrenceId = buildCalendarOccurrenceId({
    seriesId,
    occurrenceDay,
  });

  const nextState = applyCalendarEventEdit({
    state,
    scope: 'this-occurrence',
    occurrenceId,
    occurrenceDay,
    event: eventInput,
  });

  return {
    detachedEventId: findDetachedEventId({ detachedEvents, occurrenceDay }),
    detachedInput: {
      ...eventInput,
      recurrenceRule: null,
      recurrenceTimezone: anchorEvent.recurrenceTimezone,
      recurrenceSeriesId: seriesId,
      recurrenceOccurrenceDay: occurrenceDay,
      recurrenceSkippedOccurrenceDays: null,
    },
    anchorUpdate: buildAnchorSkippedDaysUpdate({
      anchorEvent,
      skippedOccurrenceIds: nextState.skippedOccurrenceIds,
      seriesId,
    }),
  };
};

// "Whole series" edit: swap the rule (and optionally DTSTART) on the anchor.
// Already-materialized exceptions are preserved by the dispatcher, so the
// serialized exclusion column is written back unchanged.
export const planCalendarSeriesEdit = ({
  anchorEvent,
  detachedEvents,
  rule,
  seriesStart,
  eventInput,
}: {
  anchorEvent: CalendarEventRecord;
  detachedEvents: CalendarEventRecord[];
  rule: CalendarRecurrenceRule;
  seriesStart?: string;
  eventInput: CalendarEventInput;
}): CalendarSeriesEditPlan | null => {
  const state = buildCalendarRecurrenceSeriesStateFromEvents({
    anchorEvent,
    detachedEvents,
  });

  if (state === null) {
    return null;
  }

  const nextState = applyCalendarEventEdit({
    state,
    scope: 'whole-series',
    rule,
    seriesStart,
  });

  return {
    anchorId: anchorEvent.id,
    anchorInput: {
      ...eventInput,
      recurrenceRule: serializeCalendarRecurrenceRule(rule),
      recurrenceTimezone: anchorEvent.recurrenceTimezone,
      recurrenceSeriesId: nextState.series.seriesId,
      recurrenceOccurrenceDay: null,
      recurrenceSkippedOccurrenceDays: serializeStateSkippedDays({
        skippedOccurrenceIds: nextState.skippedOccurrenceIds,
        seriesId: nextState.series.seriesId,
      }),
    },
  };
};

// "This occurrence" delete: record the exclusion and drop that occurrence's
// detached replacement. Re-running the plan for an already-skipped day is a
// no-op (same serialized column, no detached row to delete).
export const planCalendarOccurrenceDelete = ({
  anchorEvent,
  detachedEvents,
  occurrenceDay,
}: {
  anchorEvent: CalendarEventRecord;
  detachedEvents: CalendarEventRecord[];
  occurrenceDay: string;
}): CalendarOccurrenceDeletePlan | null => {
  const state = buildCalendarRecurrenceSeriesStateFromEvents({
    anchorEvent,
    detachedEvents,
  });

  if (state === null) {
    return null;
  }

  const seriesId = state.series.seriesId;
  const occurrenceId = buildCalendarOccurrenceId({
    seriesId,
    occurrenceDay,
  });

  const nextState = applyCalendarEventDelete({
    state,
    scope: 'this-occurrence',
    occurrenceId,
  });

  // The this-occurrence branch never returns null; a null here would mean the
  // dispatcher contract changed, so refuse rather than persist a bad state.
  if (nextState === null) {
    return null;
  }

  return {
    anchorUpdate: buildAnchorSkippedDaysUpdate({
      anchorEvent,
      skippedOccurrenceIds: nextState.skippedOccurrenceIds,
      seriesId,
    }),
    detachedEventId: findDetachedEventId({ detachedEvents, occurrenceDay }),
  };
};

// "Whole series" delete: the dispatcher returns null (no series state to carry),
// so the anchor and every detached sibling row are removed together.
export const planCalendarSeriesDelete = ({
  anchorEvent,
  detachedEvents,
}: {
  anchorEvent: CalendarEventRecord;
  detachedEvents: CalendarEventRecord[];
}): CalendarSeriesDeletePlan | null => {
  const state = buildCalendarRecurrenceSeriesStateFromEvents({
    anchorEvent,
    detachedEvents,
  });

  if (state === null) {
    return null;
  }

  const nextState = applyCalendarEventDelete({
    state,
    scope: 'whole-series',
  });

  if (isDefined(nextState)) {
    return null;
  }

  return {
    seriesDeleteIds: [
      anchorEvent.id,
      ...detachedEvents
        .filter((detachedEvent) =>
          isNonEmptyString(detachedEvent.recurrenceOccurrenceDay),
        )
        .map((detachedEvent) => detachedEvent.id),
    ],
  };
};
