// Deterministic occurrence identity: series identity + the occurrence's
// wall-clock day. The day (not the resolved instant) is deliberate — an
// occurrence must keep its identity across a DST shift, and `day` is the one
// value expandCalendarRecurrence already exposes for exactly this purpose. The
// same series + day therefore always derives the same id, so retrying a
// detached materialization cannot create a second event.
export const buildCalendarOccurrenceId = ({
  seriesId,
  occurrenceDay,
}: {
  seriesId: string;
  occurrenceDay: string;
}): string => `${seriesId}@${occurrenceDay}`;
