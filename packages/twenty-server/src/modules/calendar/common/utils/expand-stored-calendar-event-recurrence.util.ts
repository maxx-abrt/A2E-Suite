import {
  buildCalendarSeriesId,
  expandCalendarRecurrence,
  parseCalendarRecurrenceRule,
  type CalendarRecurrenceOccurrence,
} from 'twenty-shared/utils';

// The stored projection of a standard calendarEvent that recurrence cares about.
// Every field is the raw column value; nothing here is provider-specific.
export type StoredCalendarEventRecurrenceRecord = {
  id: string;
  startsAt: string | null;
  recurrenceRule: string | null;
  recurrenceTimezone: string | null;
  recurrenceSeriesId: string | null;
  recurrenceOccurrenceDay: string | null;
  recurrenceSkippedOccurrenceDays: string | null;
};

const DEFAULT_TIMEZONE = 'UTC';

// Twenty stores an unset TEXT field as an empty string as well as NULL, so both
// mean "absent" here.
const isAbsent = (value: string | null): value is null =>
  value === null || value.length === 0;

const parseSkippedDays = (rawSkippedDays: string | null): string[] => {
  if (isAbsent(rawSkippedDays)) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawSkippedDays);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((day): day is string => typeof day === 'string');
  } catch {
    return [];
  }
};

// Rebuilds a recurring series from its persisted standard calendarEvent rows and
// expands it over [rangeStart, rangeEnd). The anchor is the row carrying a rule;
// detached occurrences are sibling rows sharing the series id and naming the day
// they replace. This is the stored path: no rule or exception is invented, it is
// read back exactly as the calendar wrote it.
export const expandStoredCalendarEventRecurrence = ({
  records,
  rangeStart,
  rangeEnd,
  weekStartsOnDayIndex,
}: {
  records: StoredCalendarEventRecurrenceRecord[];
  rangeStart: string;
  rangeEnd: string;
  weekStartsOnDayIndex?: number | null;
}): CalendarRecurrenceOccurrence[] => {
  const anchorRecord = records.find(
    (record) =>
      !isAbsent(record.recurrenceRule) &&
      isAbsent(record.recurrenceOccurrenceDay),
  );

  if (anchorRecord === undefined) {
    return [];
  }

  const serializedRule = anchorRecord.recurrenceRule;
  const seriesStart = anchorRecord.startsAt;

  if (isAbsent(serializedRule) || isAbsent(seriesStart)) {
    return [];
  }

  const rule = parseCalendarRecurrenceRule(serializedRule);

  if (rule === null) {
    return [];
  }

  const seriesId = isAbsent(anchorRecord.recurrenceSeriesId)
    ? buildCalendarSeriesId({ seriesAnchorEventId: anchorRecord.id })
    : anchorRecord.recurrenceSeriesId;

  const occurrences = expandCalendarRecurrence({
    rule,
    seriesStart,
    rangeStart,
    rangeEnd,
    timeZone: isAbsent(anchorRecord.recurrenceTimezone)
      ? DEFAULT_TIMEZONE
      : anchorRecord.recurrenceTimezone,
    weekStartsOnDayIndex,
  });

  const skippedDays = new Set(
    parseSkippedDays(anchorRecord.recurrenceSkippedOccurrenceDays),
  );

  const detachedRecords = records.filter(
    (record) =>
      record.recurrenceSeriesId === seriesId &&
      !isAbsent(record.recurrenceOccurrenceDay),
  );

  const startsAtByDay = new Map(
    occurrences.map((occurrence) => [occurrence.day, occurrence.startsAt]),
  );

  for (const detachedRecord of detachedRecords) {
    if (
      isAbsent(detachedRecord.recurrenceOccurrenceDay) ||
      isAbsent(detachedRecord.startsAt)
    ) {
      continue;
    }

    const occurrenceDay = detachedRecord.recurrenceOccurrenceDay;

    // A detached occurrence only overrides an occurrence the rule actually
    // materialized in this window; a day the rule never produced is not a
    // recurrence occurrence just because a stray row names it.
    if (!startsAtByDay.has(occurrenceDay)) {
      continue;
    }

    startsAtByDay.set(occurrenceDay, detachedRecord.startsAt);
  }

  return occurrences
    .filter((occurrence) => !skippedDays.has(occurrence.day))
    .map((occurrence) => ({
      day: occurrence.day,
      startsAt: startsAtByDay.get(occurrence.day) ?? occurrence.startsAt,
    }));
};
