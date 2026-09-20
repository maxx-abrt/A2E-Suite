import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type Temporal } from 'temporal-polyfill';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarEventChip } from '@/calendar/components/CalendarEventChip';
import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';

type CalendarDayViewProps = {
  day: Temporal.PlainDate;
  spansByDay: Map<string, CalendarEventSpan[]>;
  selectedEventId: string | null;
  timeZone: string;
  locale?: string;
  onSelectEvent: (eventId: string) => void;
};

const StyledDay = styled.section`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledDayHeader = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  max-width: 640px;
`;

const StyledEmpty = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

export const CalendarDayView = ({
  day,
  spansByDay,
  selectedEventId,
  timeZone,
  locale,
  onSelectEvent,
}: CalendarDayViewProps) => {
  const { t } = useLingui();
  const daySpans = spansByDay.get(day.toString()) ?? [];

  return (
    <StyledDay aria-label={t`Day calendar`}>
      <StyledDayHeader>
        {day.toLocaleString(locale, { dateStyle: 'full' })}
      </StyledDayHeader>
      {daySpans.length === 0 ? (
        <StyledEmpty>{t`No events on this day`}</StyledEmpty>
      ) : (
        <StyledList>
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
        </StyledList>
      )}
    </StyledDay>
  );
};
