import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';
import { IconCalendarEvent, IconMap } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarTaskDueChip } from '@/calendar/components/CalendarTaskDueChip';
import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';
import { type CalendarTaskDue } from '@/calendar/types/CalendarTaskDue';
import { formatCalendarEventTime } from '@/calendar/utils/formatCalendarEventTime';
import { getCalendarEventAccentColor } from '@/calendar/utils/getCalendarEventAccentColor';

type CalendarAgendaViewProps = {
  days: Temporal.PlainDate[];
  spansByDay: Map<string, CalendarEventSpan[]>;
  taskDuesByDay: Map<string, CalendarTaskDue[]>;
  selectedEventId: string | null;
  timeZone: string;
  locale?: string;
  onSelectEvent: (eventId: string) => void;
  onOpenTask: (taskId: string) => void;
};

const StyledAgenda = styled.section`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledDayGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledDayHeading = styled.h3`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledItem = styled.button<{ accentColor: string; isSelected: boolean }>`
  background: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.medium
      : 'transparent'};
  border: 1px solid
    ${({ isSelected, accentColor }) =>
      isSelected ? accentColor : themeCssVariables.border.color.light};
  border-left: 4px solid ${({ accentColor }) => accentColor};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-family: inherit;
  gap: ${themeCssVariables.spacing[1]};
  max-width: 720px;
  padding: ${themeCssVariables.spacing[2]};
  text-align: left;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

const StyledItemHeader = styled.span`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledItemTitle = styled.span<{ isCanceled: boolean }>`
  font-weight: ${themeCssVariables.font.weight.medium};
  text-decoration: ${({ isCanceled }) =>
    isCanceled ? 'line-through' : 'none'};
`;

const StyledMeta = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledDescription = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  white-space: pre-wrap;
`;

const StyledEmpty = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

export const CalendarAgendaView = ({
  days,
  spansByDay,
  taskDuesByDay,
  selectedEventId,
  timeZone,
  locale,
  onSelectEvent,
  onOpenTask,
}: CalendarAgendaViewProps) => {
  const { t } = useLingui();
  const daysWithEvents = days.filter(
    (day) =>
      (spansByDay.get(day.toString()) ?? []).length > 0 ||
      (taskDuesByDay.get(day.toString()) ?? []).length > 0,
  );

  return (
    <StyledAgenda aria-label={t`Agenda`}>
      {daysWithEvents.length === 0 ? (
        <StyledEmpty>{t`No events in this range`}</StyledEmpty>
      ) : (
        daysWithEvents.map((day) => (
          <StyledDayGroup key={day.toString()}>
            <StyledDayHeading>
              {day.toLocaleString(locale, { dateStyle: 'full' })}
            </StyledDayHeading>
            {(spansByDay.get(day.toString()) ?? []).map((span) => {
              const accentColor = getCalendarEventAccentColor(span.event.id);
              const title = isDefined(span.event.title)
                ? span.event.title
                : t`Untitled event`;
              const time = span.isAllDay
                ? t`All day`
                : formatCalendarEventTime({
                    event: span.event,
                    timeZone,
                    locale,
                  });

              return (
                <StyledItem
                  key={span.event.id}
                  type="button"
                  accentColor={accentColor}
                  isSelected={span.event.id === selectedEventId}
                  aria-pressed={span.event.id === selectedEventId}
                  data-testid={`calendar-agenda-event-${span.event.id}`}
                  onClick={() => onSelectEvent(span.event.id)}
                >
                  <StyledItemHeader>
                    <IconCalendarEvent size={16} />
                    <StyledItemTitle isCanceled={span.event.isCanceled}>
                      {title}
                    </StyledItemTitle>
                  </StyledItemHeader>
                  <StyledMeta>{time}</StyledMeta>
                  {isDefined(span.event.location) && (
                    <StyledMeta>
                      <IconMap size={12} />
                      {span.event.location}
                    </StyledMeta>
                  )}
                  {isDefined(span.event.description) && (
                    <StyledDescription>
                      {span.event.description}
                    </StyledDescription>
                  )}
                </StyledItem>
              );
            })}
            {(taskDuesByDay.get(day.toString()) ?? []).map((taskDue) => (
              <CalendarTaskDueChip
                key={taskDue.task.id}
                taskDue={taskDue}
                variant="row"
                onOpenTask={onOpenTask}
              />
            ))}
          </StyledDayGroup>
        ))
      )}
    </StyledAgenda>
  );
};
