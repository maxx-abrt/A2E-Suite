import { isDefined } from 'twenty-shared/utils';

import { CALENDAR_RECURRENCE_FREQUENCY_TO_TOKEN } from '@/calendar/types/CalendarRecurrenceFrequency';
import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import { CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK } from '@/calendar/types/CalendarRecurrenceWeekday';

// Canonical, compact RFC 5545-flavoured form: FREQ first, then the non-default
// parts in a fixed order. Interval 1 is omitted because it is the default the
// parser restores, so serialize(parse(value)) is stable.
export const serializeCalendarRecurrenceRule = (
  rule: CalendarRecurrenceRule,
): string => {
  const parts = [
    `FREQ=${CALENDAR_RECURRENCE_FREQUENCY_TO_TOKEN[rule.frequency]}`,
  ];

  if (rule.interval !== 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }

  const byDayTokens: string[] = [];

  if (isDefined(rule.monthlyPosition)) {
    byDayTokens.push(
      `${rule.monthlyPosition.ordinal}${rule.monthlyPosition.weekday}`,
    );
  }

  byDayTokens.push(
    ...[...rule.byWeekdays].sort(
      (left, right) =>
        CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[left] -
        CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[right],
    ),
  );

  if (byDayTokens.length > 0) {
    parts.push(`BYDAY=${byDayTokens.join(',')}`);
  }

  if (isDefined(rule.count)) {
    parts.push(`COUNT=${rule.count}`);
  }

  if (isDefined(rule.until)) {
    parts.push(`UNTIL=${rule.until}`);
  }

  return parts.join(';');
};
