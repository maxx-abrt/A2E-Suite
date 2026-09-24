import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Temporal } from 'temporal-polyfill';
import {
  CALENDAR_RECURRENCE_FREQUENCIES,
  CALENDAR_RECURRENCE_WEEKDAYS,
  CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK,
  isDefined,
} from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type CalendarRecurrenceDraft,
  type CalendarRecurrenceEndMode,
  type CalendarRecurrenceMonthlyMode,
} from '@/calendar/types/CalendarRecurrenceDraft';
import { type CalendarRecurrenceFrequency } from '@/calendar/types/CalendarRecurrenceFrequency';
import { type CalendarRecurrenceWeekday } from '@/calendar/types/CalendarRecurrenceWeekday';
import { buildDefaultCalendarRecurrenceDraft } from '@/calendar/utils/buildDefaultCalendarRecurrenceDraft';
import { getCalendarMonthlyPositionForDay } from '@/calendar/utils/getCalendarMonthlyPositionForDay';

type CalendarRecurrenceFieldsProps = {
  recurrence: CalendarRecurrenceDraft | null;
  startDay: Temporal.PlainDate;
  locale: string;
  canDisableRecurrence: boolean;
  onChange: (recurrence: CalendarRecurrenceDraft | null) => void;
};

const NO_RECURRENCE_VALUE = 'none';

// 2024-01-01 is a Monday: offsetting it by the ISO weekday index yields a date
// for each weekday, which Intl then names in the user's locale.
const ISO_WEEK_REFERENCE_MONDAY = Temporal.PlainDate.from('2024-01-01');

const StyledFieldset = styled.fieldset`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin: 0;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledLegend = styled.legend`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLabel = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
  }
`;

const StyledNumberInput = styled.input`
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  width: 64px;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
  }
`;

const StyledDateInput = styled(StyledNumberInput)`
  width: auto;
`;

const StyledWeekdayButton = styled.button<{ isSelected: boolean }>`
  background: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.blue
      : themeCssVariables.background.transparent.light};
  border: 1px solid
    ${({ isSelected }) =>
      isSelected
        ? themeCssVariables.border.color.blue
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  min-width: 36px;
  padding: ${themeCssVariables.spacing[1]};

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
  }
`;

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getWeekdayLabel = ({
  weekday,
  locale,
  format,
}: {
  weekday: CalendarRecurrenceWeekday;
  locale: string;
  format: 'short' | 'long';
}): string =>
  ISO_WEEK_REFERENCE_MONDAY.add({
    days: CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[weekday] - 1,
  }).toLocaleString(locale, { weekday: format });

// The "Repeat" controls of the event composer: frequency, interval, weekdays,
// monthly selector and end condition. Everything is a labelled native control
// so the whole rule can be built from the keyboard.
export const CalendarRecurrenceFields = ({
  recurrence,
  startDay,
  locale,
  canDisableRecurrence,
  onChange,
}: CalendarRecurrenceFieldsProps) => {
  const { t } = useLingui();

  const ordinalLabels: Record<number, string> = {
    1: t`First`,
    2: t`Second`,
    3: t`Third`,
    4: t`Fourth`,
    [-1]: t`Last`,
  };

  const frequencyUnitLabels: Record<CalendarRecurrenceFrequency, string> = {
    daily: t`day(s)`,
    weekly: t`week(s)`,
    monthly: t`month(s)`,
  };

  const handleFrequencyChange = (value: string) => {
    if (value === NO_RECURRENCE_VALUE) {
      onChange(null);
      return;
    }

    const frequency = CALENDAR_RECURRENCE_FREQUENCIES.find(
      (candidate) => candidate === value,
    );

    if (!isDefined(frequency)) {
      return;
    }

    onChange(
      recurrence === null
        ? buildDefaultCalendarRecurrenceDraft({ frequency, startDay })
        : { ...recurrence, frequency },
    );
  };

  if (recurrence === null) {
    return (
      <StyledFieldset data-testid="calendar-recurrence-fields">
        <StyledLegend>{t`Repeat`}</StyledLegend>
        <StyledLabel>
          {t`Repeat`}
          <StyledSelect
            aria-label={t`Repeat`}
            value={NO_RECURRENCE_VALUE}
            onChange={(event) => handleFrequencyChange(event.target.value)}
          >
            <option value={NO_RECURRENCE_VALUE}>{t`Does not repeat`}</option>
            <option value="daily">{t`Daily`}</option>
            <option value="weekly">{t`Weekly`}</option>
            <option value="monthly">{t`Monthly`}</option>
          </StyledSelect>
        </StyledLabel>
      </StyledFieldset>
    );
  }

  const startDayPosition = getCalendarMonthlyPositionForDay(startDay);
  const displayedPosition = recurrence.monthlyPosition ?? startDayPosition;
  const showsWeekdayPicker =
    recurrence.frequency === 'weekly' ||
    (recurrence.frequency === 'monthly' &&
      recurrence.monthlyMode === 'weekdays');

  const handleToggleWeekday = (weekday: CalendarRecurrenceWeekday) => {
    const isSelected = recurrence.byWeekdays.includes(weekday);
    const nextWeekdays = isSelected
      ? recurrence.byWeekdays.filter((candidate) => candidate !== weekday)
      : [...recurrence.byWeekdays, weekday];

    // At least one weekday must stay selected, otherwise the rule would have
    // nothing to repeat on.
    if (nextWeekdays.length === 0) {
      return;
    }

    onChange({ ...recurrence, byWeekdays: nextWeekdays });
  };

  const handleMonthlyModeChange = (value: string) => {
    const monthlyMode = value as CalendarRecurrenceMonthlyMode;

    onChange({
      ...recurrence,
      monthlyMode,
      monthlyPosition:
        monthlyMode === 'weekday-position'
          ? startDayPosition
          : recurrence.monthlyPosition,
    });
  };

  const handleUntilDayChange = (value: string) => {
    try {
      onChange({ ...recurrence, untilDay: Temporal.PlainDate.from(value) });
    } catch {
      // Ignore an incomplete date while the user is typing.
    }
  };

  const ordinalLabel = ordinalLabels[displayedPosition.ordinal] ?? '';
  const weekdayLabel = getWeekdayLabel({
    weekday: displayedPosition.weekday,
    locale,
    format: 'long',
  });
  const positionLabel = t`${ordinalLabel} ${weekdayLabel}`;
  const startDayOfMonth = startDay.day;

  return (
    <StyledFieldset data-testid="calendar-recurrence-fields">
      <StyledLegend>{t`Repeat`}</StyledLegend>
      <StyledRow>
        <StyledLabel>
          {t`Repeat`}
          <StyledSelect
            aria-label={t`Repeat`}
            value={recurrence.frequency}
            onChange={(event) => handleFrequencyChange(event.target.value)}
          >
            {canDisableRecurrence && (
              <option value={NO_RECURRENCE_VALUE}>{t`Does not repeat`}</option>
            )}
            <option value="daily">{t`Daily`}</option>
            <option value="weekly">{t`Weekly`}</option>
            <option value="monthly">{t`Monthly`}</option>
          </StyledSelect>
        </StyledLabel>
        <StyledLabel>
          {t`Every`}
          <StyledNumberInput
            type="number"
            min={1}
            max={99}
            aria-label={t`Repeat interval`}
            value={recurrence.interval}
            onChange={(event) =>
              onChange({
                ...recurrence,
                interval: parsePositiveInteger(
                  event.target.value,
                  recurrence.interval,
                ),
              })
            }
          />
          {frequencyUnitLabels[recurrence.frequency]}
        </StyledLabel>
      </StyledRow>

      {recurrence.frequency === 'monthly' && (
        <StyledLabel>
          {t`On`}
          <StyledSelect
            aria-label={t`Monthly repeat`}
            value={recurrence.monthlyMode}
            onChange={(event) => handleMonthlyModeChange(event.target.value)}
          >
            <option value="day-of-month">{t`Day ${startDayOfMonth}`}</option>
            <option value="weekday-position">{positionLabel}</option>
            <option value="weekdays">{t`Selected weekdays`}</option>
          </StyledSelect>
        </StyledLabel>
      )}

      {showsWeekdayPicker && (
        <StyledRow role="group" aria-label={t`Repeat on`}>
          {CALENDAR_RECURRENCE_WEEKDAYS.map((weekday) => {
            const isSelected = recurrence.byWeekdays.includes(weekday);

            return (
              <StyledWeekdayButton
                key={weekday}
                type="button"
                isSelected={isSelected}
                aria-pressed={isSelected}
                aria-label={getWeekdayLabel({
                  weekday,
                  locale,
                  format: 'long',
                })}
                onClick={() => handleToggleWeekday(weekday)}
              >
                {getWeekdayLabel({ weekday, locale, format: 'short' })}
              </StyledWeekdayButton>
            );
          })}
        </StyledRow>
      )}

      <StyledRow>
        <StyledLabel>
          {t`Ends`}
          <StyledSelect
            aria-label={t`Ends`}
            value={recurrence.endMode}
            onChange={(event) =>
              onChange({
                ...recurrence,
                endMode: event.target.value as CalendarRecurrenceEndMode,
              })
            }
          >
            <option value="never">{t`Never`}</option>
            <option value="count">{t`After a number of times`}</option>
            <option value="until">{t`On a date`}</option>
          </StyledSelect>
        </StyledLabel>
        {recurrence.endMode === 'count' && (
          <StyledLabel>
            <StyledNumberInput
              type="number"
              min={1}
              max={999}
              aria-label={t`Number of occurrences`}
              value={recurrence.count}
              onChange={(event) =>
                onChange({
                  ...recurrence,
                  count: parsePositiveInteger(
                    event.target.value,
                    recurrence.count,
                  ),
                })
              }
            />
            {t`times`}
          </StyledLabel>
        )}
        {recurrence.endMode === 'until' && (
          <StyledDateInput
            type="date"
            aria-label={t`Last day`}
            min={startDay.toString()}
            value={recurrence.untilDay.toString()}
            onChange={(event) => handleUntilDayChange(event.target.value)}
          />
        )}
      </StyledRow>
    </StyledFieldset>
  );
};
