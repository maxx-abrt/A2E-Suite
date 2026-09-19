import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { formatPomodoroClock } from '@/home-dashboard/utils/pomodoroTimer';

const StyledContainer = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: center;
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const StyledPhaseLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const StyledClock = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  line-height: 1;
`;

const StyledHabitRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledHabitDot = styled.span<{ isDone: boolean }>`
  background: ${({ isDone }) =>
    isDone
      ? themeCssVariables.color.blue8
      : themeCssVariables.background.transparent.medium};
  border-radius: ${themeCssVariables.border.radius.rounded};
  height: 8px;
  width: 8px;
`;

const StyledHabitCaption = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

export type PomodoroWidgetContentProps = {
  secondsRemaining: number;
  isRunning: boolean;
  completedFocusSessions: number;
  focusSessionTarget: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
};

export const PomodoroWidgetContent = ({
  secondsRemaining,
  isRunning,
  completedFocusSessions,
  focusSessionTarget,
  onStart,
  onPause,
  onReset,
}: PomodoroWidgetContentProps) => {
  const { t } = useLingui();

  return (
    <StyledContainer data-testid="home-pomodoro">
      <StyledPhaseLabel role="status">
        {isRunning ? t`Focus in progress` : t`Ready to focus`}
      </StyledPhaseLabel>
      <StyledClock data-testid="home-pomodoro-clock">
        {formatPomodoroClock(secondsRemaining)}
      </StyledClock>
      {/* The dots only re-encode the caption below; keep them out of the
          accessibility tree so the count is announced once, not twice. */}
      <StyledHabitRow aria-hidden="true">
        {Array.from({ length: focusSessionTarget }).map((_, index) => (
          <StyledHabitDot
            key={index}
            isDone={index < completedFocusSessions}
            data-testid={`home-pomodoro-habit-${index}`}
            data-done={index < completedFocusSessions}
          />
        ))}
      </StyledHabitRow>
      <StyledHabitCaption role="status">
        {t`${completedFocusSessions} of ${focusSessionTarget} focus sessions today`}
      </StyledHabitCaption>
      <StyledActions>
        <Button
          title={isRunning ? t`Pause` : t`Start`}
          size="small"
          accent="blue"
          onClick={isRunning ? onPause : onStart}
          dataTestId="home-pomodoro-toggle"
        />
        <Button
          title={t`Reset`}
          size="small"
          variant="secondary"
          onClick={onReset}
          dataTestId="home-pomodoro-reset"
        />
      </StyledActions>
    </StyledContainer>
  );
};
