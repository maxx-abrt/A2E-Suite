import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';
import { IconCalendarEvent, IconMap } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';
import { formatCalendarEventTime } from '@/calendar/utils/formatCalendarEventTime';
import { getCalendarEventAccentColor } from '@/calendar/utils/getCalendarEventAccentColor';

type CalendarEventChipProps = {
  span: CalendarEventSpan;
  day: Temporal.PlainDate;
  isSelected: boolean;
  showTime: boolean;
  timeZone: string;
  locale?: string;
  onSelect: (eventId: string) => void;
};

const StyledChip = styled.button<{ accentColor: string; isSelected: boolean }>`
  align-items: flex-start;
  background: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.medium
      : themeCssVariables.background.transparent.light};
  border: 1px solid
    ${({ isSelected, accentColor }) =>
      isSelected ? accentColor : themeCssVariables.border.color.light};
  border-left: 3px solid ${({ accentColor }) => accentColor};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]};
  text-align: left;
  width: 100%;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
  }
`;

const StyledChipText = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const StyledTitle = styled.span<{ isCanceled: boolean }>`
  overflow: hidden;
  text-decoration: ${({ isCanceled }) =>
    isCanceled ? 'line-through' : 'none'};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledMeta = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledContinuation = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
`;

export const CalendarEventChip = ({
  span,
  day,
  isSelected,
  showTime,
  timeZone,
  locale,
  onSelect,
}: CalendarEventChipProps) => {
  const { t } = useLingui();
  const accentColor = getCalendarEventAccentColor(span.event.id);
  const title = isDefined(span.event.title)
    ? span.event.title
    : t`Untitled event`;
  const time = span.isAllDay
    ? t`All day`
    : formatCalendarEventTime({ event: span.event, timeZone, locale });
  const continuesBefore = Temporal.PlainDate.compare(span.startDay, day) === -1;
  const continuesAfter = Temporal.PlainDate.compare(span.endDay, day) === 1;
  const accessibleLabel = [
    title,
    time,
    span.event.location ?? null,
    continuesBefore ? t`Continues from a previous day` : null,
    continuesAfter ? t`Continues on a next day` : null,
  ]
    .filter(isDefined)
    .join(', ');

  return (
    <StyledChip
      type="button"
      accentColor={accentColor}
      isSelected={isSelected}
      aria-pressed={isSelected}
      aria-label={accessibleLabel}
      data-testid={`calendar-event-${span.event.id}`}
      onClick={() => onSelect(span.event.id)}
    >
      <IconCalendarEvent size={14} />
      <StyledChipText>
        <StyledTitle isCanceled={span.event.isCanceled}>
          {title}
          {continuesAfter ? ' →' : ''}
        </StyledTitle>
        {showTime && <StyledMeta>{time}</StyledMeta>}
        {isDefined(span.event.location) && showTime && (
          <StyledMeta>
            <IconMap size={12} />
            {span.event.location}
          </StyledMeta>
        )}
      </StyledChipText>
      {continuesBefore && <StyledContinuation>←</StyledContinuation>}
    </StyledChip>
  );
};
