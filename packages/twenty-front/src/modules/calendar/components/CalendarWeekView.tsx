import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type Temporal } from 'temporal-polyfill';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarEventChip } from '@/calendar/components/CalendarEventChip';
import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';

type CalendarWeekViewProps = {
  days: Temporal.PlainDate[];
  spansByDay: Map<string, CalendarEventSpan[]>;
  selectedEventId: string | null;
  timeZone: string;
  locale?: string;
  onSelectEvent: (eventId: string) => void;
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
  selectedEventId,
  timeZone,
  locale,
  onSelectEvent,
}: CalendarWeekViewProps) => {
  const { t } = useLingui();

  return (
    <StyledScroll>
      <StyledWeek role="list" aria-label={t`Week calendar`}>
        {days.map((day) => {
          const daySpans = spansByDay.get(day.toString()) ?? [];

          return (
            <StyledDayColumn role="listitem" key={day.toString()}>
              <StyledDayHeader>
                {day.toLocaleString(locale, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </StyledDayHeader>
              {daySpans.length === 0 ? (
                <StyledEmpty>{t`No events`}</StyledEmpty>
              ) : (
                daySpans.map((span) => (
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
                ))
              )}
            </StyledDayColumn>
          );
        })}
      </StyledWeek>
    </StyledScroll>
  );
};
