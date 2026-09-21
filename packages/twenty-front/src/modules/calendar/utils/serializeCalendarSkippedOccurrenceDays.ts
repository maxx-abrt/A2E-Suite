// Serializes the exclusion list back to the stored JSON column. Days are
// deduplicated and sorted so a retried delete of the same occurrence produces
// the exact same string (no churn, no duplicate exclusion entries).
export const serializeCalendarSkippedOccurrenceDays = (
  skippedOccurrenceDays: string[],
): string => JSON.stringify([...new Set(skippedOccurrenceDays)].sort());
