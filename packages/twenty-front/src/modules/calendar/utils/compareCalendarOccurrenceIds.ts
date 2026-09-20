// Canonical ordering for the exception lists. Occurrence ids start with the
// series id and end with the ISO day, so a plain lexicographic compare is stable
// and chronological. Kept in one place so two states holding the same exceptions
// are structurally equal regardless of the order they were materialized in.
export const compareCalendarOccurrenceIds = (
  left: string,
  right: string,
): number => (left < right ? -1 : left > right ? 1 : 0);
