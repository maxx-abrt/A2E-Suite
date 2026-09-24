import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconCheckbox } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type CalendarTaskDue } from '@/calendar/types/CalendarTaskDue';

type CalendarTaskDueChipProps = {
  taskDue: CalendarTaskDue;
  variant: 'compact' | 'row';
  onOpenTask: (taskId: string) => void;
};

// Dashed outline + task icon: a deadline must never read as a scheduled event
// (C5), so it does not borrow the event chip's accent border.
const StyledChip = styled.button<{ isDone: boolean; isRow: boolean }>`
  align-items: center;
  background: transparent;
  border: 1px dashed ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isDone }) =>
    isDone
      ? themeCssVariables.font.color.tertiary
      : themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${({ isRow }) =>
    isRow ? themeCssVariables.font.size.sm : themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  max-width: ${({ isRow }) => (isRow ? '720px' : 'none')};
  padding: ${({ isRow }) =>
    isRow ? themeCssVariables.spacing[2] : themeCssVariables.spacing[1]};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
  }
`;

const StyledTitle = styled.span<{ isDone: boolean }>`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-decoration: ${({ isDone }) => (isDone ? 'line-through' : 'none')};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledState = styled.span<{ isOverdue: boolean }>`
  color: ${({ isOverdue }) =>
    isOverdue
      ? themeCssVariables.font.color.danger
      : themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
`;

export const CalendarTaskDueChip = ({
  taskDue,
  variant,
  onOpenTask,
}: CalendarTaskDueChipProps) => {
  const { t } = useLingui();
  const title = isNonEmptyString(taskDue.task.title)
    ? taskDue.task.title
    : t`Untitled task`;
  const stateLabel = taskDue.isDone
    ? t`Done`
    : taskDue.isOverdue
      ? t`Overdue`
      : t`Due`;

  return (
    <StyledChip
      type="button"
      isDone={taskDue.isDone}
      isRow={variant === 'row'}
      aria-label={t`Task due: ${title}, ${stateLabel}. Open task`}
      data-testid={`calendar-task-due-${taskDue.task.id}`}
      onClick={() => onOpenTask(taskDue.task.id)}
    >
      <IconCheckbox size={variant === 'row' ? 16 : 14} />
      <StyledTitle isDone={taskDue.isDone}>{title}</StyledTitle>
      <StyledState isOverdue={taskDue.isOverdue}>{stateLabel}</StyledState>
    </StyledChip>
  );
};
