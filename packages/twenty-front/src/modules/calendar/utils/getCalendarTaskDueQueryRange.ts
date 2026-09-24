import { type Temporal } from 'temporal-polyfill';

// Instant bounds for the task `dueAt` filter: the start of the first visible
// day (inclusive) to the start of the day after the last one (exclusive), both
// in the viewer's zone so a late-evening deadline is not dropped at the edge.
export const getCalendarTaskDueQueryRange = ({
  firstDay,
  lastDay,
  timeZone,
}: {
  firstDay: Temporal.PlainDate;
  lastDay: Temporal.PlainDate;
  timeZone: string;
}): { dueAtFrom: string; dueAtBefore: string } => ({
  dueAtFrom: firstDay.toZonedDateTime(timeZone).toInstant().toString(),
  dueAtBefore: lastDay
    .add({ days: 1 })
    .toZonedDateTime(timeZone)
    .toInstant()
    .toString(),
});
