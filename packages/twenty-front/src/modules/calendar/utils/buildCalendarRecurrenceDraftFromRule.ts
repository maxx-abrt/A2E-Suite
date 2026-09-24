import { isDefined } from 'twenty-shared/utils';
import { Temporal } from 'temporal-polyfill';

import { type CalendarRecurrenceDraft } from '@/calendar/types/CalendarRecurrenceDraft';
import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import { buildDefaultCalendarRecurrenceDraft } from '@/calendar/utils/buildDefaultCalendarRecurrenceDraft';

// Stored rule -> editable "Repeat" state, so a whole-series edit reopens on
// exactly the rule that was saved (including monthly-by-weekdays rules the
// picker cannot create itself) and saving unchanged writes the same rule back.
export const buildCalendarRecurrenceDraftFromRule = ({
  rule,
  startDay,
  seriesTimeZone,
}: {
  rule: CalendarRecurrenceRule;
  startDay: Temporal.PlainDate;
  seriesTimeZone: string;
}): CalendarRecurrenceDraft => {
  const defaultDraft = buildDefaultCalendarRecurrenceDraft({
    frequency: rule.frequency,
    startDay,
  });

  let untilDay = defaultDraft.untilDay;

  if (isDefined(rule.until)) {
    try {
      untilDay = Temporal.Instant.from(rule.until)
        .toZonedDateTimeISO(seriesTimeZone)
        .toPlainDate();
    } catch {
      untilDay = defaultDraft.untilDay;
    }
  }

  return {
    frequency: rule.frequency,
    interval: rule.interval,
    byWeekdays:
      rule.byWeekdays.length > 0 ? rule.byWeekdays : defaultDraft.byWeekdays,
    monthlyMode: isDefined(rule.monthlyPosition)
      ? 'weekday-position'
      : rule.frequency === 'monthly' && rule.byWeekdays.length > 0
        ? 'weekdays'
        : 'day-of-month',
    monthlyPosition: rule.monthlyPosition ?? defaultDraft.monthlyPosition,
    endMode: isDefined(rule.count)
      ? 'count'
      : isDefined(rule.until)
        ? 'until'
        : 'never',
    count: rule.count ?? defaultDraft.count,
    untilDay,
  };
};
