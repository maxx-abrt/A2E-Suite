import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type Temporal } from 'temporal-polyfill';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarEventChip } from '@/calendar/components/CalendarEventChip';
import { CalendarTaskDueChip } from '@/calendar/components/CalendarTaskDueChip';
import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';
import { type CalendarTaskDue } from '@/calendar/types/CalendarTaskDue';

type CalendarMonthViewProps = {
  weeks: Temporal.PlainDate[][];
  anchorMonth: number;
  spansByDay: Map<string, CalendarEventSpan[]>;
  taskDuesByDay: Map<string, CalendarTaskDue[]>;
  selectedEventId: string | null;
  timeZone: string;
  locale?: string;
  onSelectEvent: (eventId: string) => void;
  onOpenTask: (taskId: string) => void;
};

const StyledScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(96px, 1fr));
  min-width: 640px;
`;

const StyledWeekday = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-align: center;
  text-transform: uppercase;
`;

const StyledCell = styled.div<{ isOutsideMonth: boolean }>`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 96px;
  opacity: ${({ isOutsideMonth }) => (isOutsideMonth ? 0.5 : 1)};
  padding: ${themeCssVariables.spacing[1]};
`;

const StyledDayNumber = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
`;

export const CalendarMonthView = ({
  weeks,
  anchorMonth,
  spansByDay,
  taskDuesByDay,
  selectedEventId,
  timeZone,
  locale,
  onSelectEvent,
  onOpenTask,
}: CalendarMonthViewProps) => {
  const { t } = useLingui();
  const weekdayLabels = (weeks[0] ?? []).map((day) =>
    day.toLocaleString(locale, { weekday: 'short' }),
  );

  return (
    <StyledScroll>
      <StyledGrid role="grid" aria-label={t`Month calendar`}>
        <div role="row">
          {weekdayLabels.map((label, index) => (
            <StyledWeekday key={index} role="columnheader">
              {label}
            </StyledWeekday>
          ))}
        </div>
        {weeks.map((week) => (
          <div
            role="row"
            key={week[0]?.toString()}
            style={{ display: 'contents' }}
          >
            {week.map((day) => {
              const daySpans = spansByDay.get(day.toString()) ?? [];
              const dayTaskDues = taskDuesByDay.get(day.toString()) ?? [];

              return (
                <StyledCell
                  key={day.toString()}
                  role="gridcell"
                  isOutsideMonth={day.month !== anchorMonth}
                  aria-label={day.toLocaleString(locale, { dateStyle: 'full' })}
                >
                  <StyledDayNumber>{day.day}</StyledDayNumber>
                  {daySpans.map((span) => (
                    <CalendarEventChip
                      key={span.event.id}
                      span={span}
                      day={day}
                      isSelected={span.event.id === selectedEventId}
                      showTime={false}
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
                </StyledCell>
              );
            })}
          </div>
        ))}
      </StyledGrid>
    </StyledScroll>
  );
};
