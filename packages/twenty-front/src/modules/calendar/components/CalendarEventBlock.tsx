import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type CalendarEventOverlapLayout } from '@/calendar/types/CalendarEventOverlapLayout';
import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';
import { formatCalendarEventTime } from '@/calendar/utils/formatCalendarEventTime';
import { getCalendarEventAccentColor } from '@/calendar/utils/getCalendarEventAccentColor';

type CalendarEventBlockProps = {
  span: CalendarEventSpan;
  layout: CalendarEventOverlapLayout;
  isSelected: boolean;
  timeZone: string;
  locale?: string;
  onSelect: (eventId: string) => void;
};

const StyledBlock = styled.button<{ accentColor: string; isSelected: boolean }>`
  align-items: flex-start;
  background: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.medium
      : themeCssVariables.background.secondary};
  border: 1px solid
    ${({ isSelected, accentColor }) =>
      isSelected ? accentColor : themeCssVariables.border.color.light};
  border-left: 3px solid ${({ accentColor }) => accentColor};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 2px;
  min-height: 20px;
  overflow: hidden;
  padding: 2px 4px;
  pointer-events: auto;
  position: absolute;
  text-align: left;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
    z-index: 2;
  }
`;

const StyledBlockTitle = styled.span<{ isCanceled: boolean }>`
  overflow: hidden;
  text-decoration: ${({ isCanceled }) =>
    isCanceled ? 'line-through' : 'none'};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledBlockTime = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const CalendarEventBlock = ({
  span,
  layout,
  isSelected,
  timeZone,
  locale,
  onSelect,
}: CalendarEventBlockProps) => {
  const { t } = useLingui();
  const accentColor = getCalendarEventAccentColor(span.event.id);
  const title = isDefined(span.event.title)
    ? span.event.title
    : t`Untitled event`;
  const time = formatCalendarEventTime({
    event: span.event,
    timeZone,
    locale,
  });

  return (
    <StyledBlock
      type="button"
      accentColor={accentColor}
      isSelected={isSelected}
      aria-pressed={isSelected}
      aria-label={`${title}, ${time}`}
      data-testid={`calendar-event-${span.event.id}`}
      style={{
        top: `${layout.topRatio * 100}%`,
        height: `${layout.heightRatio * 100}%`,
        left: `calc(${(layout.columnIndex / layout.columnCount) * 100}% + 2px)`,
        width: `calc(${(1 / layout.columnCount) * 100}% - 4px)`,
      }}
      onClick={() => onSelect(span.event.id)}
    >
      <StyledBlockTitle isCanceled={span.event.isCanceled}>
        {title}
      </StyledBlockTitle>
      <StyledBlockTime>{time}</StyledBlockTime>
    </StyledBlock>
  );
};
