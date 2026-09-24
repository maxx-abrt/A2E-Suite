import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';
import { IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarEventChip } from '@/calendar/components/CalendarEventChip';
import { CalendarTaskDueChip } from '@/calendar/components/CalendarTaskDueChip';
import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';
import { type CalendarTaskDue } from '@/calendar/types/CalendarTaskDue';

type CalendarWeekViewProps = {
  days: Temporal.PlainDate[];
  spansByDay: Map<string, CalendarEventSpan[]>;
  taskDuesByDay: Map<string, CalendarTaskDue[]>;
  selectedEventId: string | null;
  timeZone: string;
  locale?: string;
  onSelectEvent: (eventId: string) => void;
  onOpenTask: (taskId: string) => void;
  // Absent when the member cannot create tasks or deadlines are hidden.
  onAddTask?: (day: Temporal.PlainDate) => void;
};

const StyledWeek = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  grid-template-columns: repeat(7, minmax(120px, 1fr));
  min-width: 720px;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

const StyledDayColumn = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 240px;
  padding: ${themeCssVariables.spacing[1]};
`;

const StyledDayHeaderRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: space-between;
  min-height: 24px;
`;

const StyledDayHeader = styled.h3`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledEmpty = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
`;

export const CalendarWeekView = ({
  days,
  spansByDay,
  taskDuesByDay,
  selectedEventId,
  timeZone,
  locale,
  onSelectEvent,
  onOpenTask,
  onAddTask,
}: CalendarWeekViewProps) => {
  const { t } = useLingui();

  return (
    <StyledScroll>
      <StyledWeek role="list" aria-label={t`Week calendar`}>
        {days.map((day) => {
          const daySpans = spansByDay.get(day.toString()) ?? [];
          const dayTaskDues = taskDuesByDay.get(day.toString()) ?? [];
          const dayLabel = day.toLocaleString(locale, { dateStyle: 'full' });

          return (
            <StyledDayColumn role="listitem" key={day.toString()}>
              <StyledDayHeaderRow>
                <StyledDayHeader>
                  {day.toLocaleString(locale, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </StyledDayHeader>
                {isDefined(onAddTask) && (
                  <Button
                    ariaLabel={t`Add a task due ${dayLabel}`}
                    Icon={IconPlus}
                    size="small"
                    variant="tertiary"
                    dataTestId={`calendar-week-add-task-${day.toString()}`}
                    onClick={() => onAddTask(day)}
                  />
                )}
              </StyledDayHeaderRow>
              {daySpans.length === 0 && dayTaskDues.length === 0 && (
                <StyledEmpty>{t`No events`}</StyledEmpty>
              )}
              {daySpans.map((span) => (
                <CalendarEventChip
                  key={span.event.id}
                  span={span}
                  day={day}
                  isSelected={span.event.id === selectedEventId}
                  showTime
                  timeZone={timeZone}
                  locale={locale}
                  onSelect={onSelectEvent}
                />
              ))}
              {dayTaskDues.map((taskDue) => (
                <CalendarTaskDueChip
                  key={taskDue.task.id}
                  taskDue={taskDue}
                  variant="compact"
                  onOpenTask={onOpenTask}
                />
              ))}
            </StyledDayColumn>
          );
        })}
      </StyledWeek>
    </StyledScroll>
  );
};
