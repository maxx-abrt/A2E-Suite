import { isNonEmptyString } from '@sniptt/guards';

// The stored `recurrenceSkippedOccurrenceDays` column is a JSON array of
// wall-clock day strings. Anything unparseable degrades to "no exclusions" — a
// corrupt value must never drop the whole series from the calendar.
export const parseCalendarSkippedOccurrenceDays = (
  rawSkippedDays: string | null,
): string[] => {
  if (!isNonEmptyString(rawSkippedDays)) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawSkippedDays);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (day): day is string => typeof day === 'string' && day.length > 0,
    );
  } catch {
    return [];
  }
};
