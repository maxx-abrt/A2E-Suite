// One expanded occurrence of a rule. `day` is the wall-clock date in the anchor
// zone (the identity a later slice keys detached/skipped occurrences on) and
// `startsAt` is the resolved ISO-8601 instant.
export type CalendarRecurrenceOccurrence = {
  day: string;
  startsAt: string;
};
