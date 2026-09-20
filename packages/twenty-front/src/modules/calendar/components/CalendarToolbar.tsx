import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  IconCalendarMonth,
  IconCalendarTime,
  IconCalendarWeek,
  IconChevronLeft,
  IconChevronRight,
  IconList,
  type IconComponent,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  CALENDAR_VIEW_MODES,
  type CalendarViewMode,
} from '@/calendar/types/CalendarViewMode';

type CalendarToolbarProps = {
  mode: CalendarViewMode;
  title: string;
  onModeChange: (mode: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledGroup = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledModeButton = styled.button<{ isActive: boolean }>`
  align-items: center;
  background: ${({ isActive }) =>
    isActive ? themeCssVariables.background.transparent.medium : 'transparent'};
  border: 1px solid
    ${({ isActive }) =>
      isActive
        ? themeCssVariables.color.blue
        : themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

export const CalendarToolbar = ({
  mode,
  title,
  onModeChange,
  onPrevious,
  onNext,
  onToday,
}: CalendarToolbarProps) => {
  const { t } = useLingui();

  const viewModeConfig: Record<
    CalendarViewMode,
    { label: string; Icon: IconComponent }
  > = {
    day: { label: t`Day`, Icon: IconCalendarTime },
    week: { label: t`Week`, Icon: IconCalendarWeek },
    month: { label: t`Month`, Icon: IconCalendarMonth },
    agenda: { label: t`Agenda`, Icon: IconList },
  };

  return (
    <StyledToolbar data-testid="calendar-toolbar">
      <StyledGroup>
        <Button
          ariaLabel={t`Today`}
          title={t`Today`}
          size="small"
          variant="tertiary"
          onClick={onToday}
        />
        <Button
          ariaLabel={t`Previous period`}
          size="small"
          variant="tertiary"
          Icon={IconChevronLeft}
          onClick={onPrevious}
        />
        <Button
          ariaLabel={t`Next period`}
          size="small"
          variant="tertiary"
          Icon={IconChevronRight}
          onClick={onNext}
        />
        <StyledTitle aria-live="polite">{title}</StyledTitle>
      </StyledGroup>
      <StyledGroup role="group" aria-label={t`Calendar view`}>
        {CALENDAR_VIEW_MODES.map((viewMode) => {
          const { label, Icon } = viewModeConfig[viewMode];

          return (
            <StyledModeButton
              key={viewMode}
              type="button"
              isActive={viewMode === mode}
              aria-pressed={viewMode === mode}
              data-testid={`calendar-view-mode-${viewMode}`}
              onClick={() => onModeChange(viewMode)}
            >
              <Icon size={14} />
              {label}
            </StyledModeButton>
          );
        })}
      </StyledGroup>
    </StyledToolbar>
  );
};
