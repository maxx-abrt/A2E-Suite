import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type Temporal } from 'temporal-polyfill';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarDayTimeGrid } from '@/calendar/components/CalendarDayTimeGrid';
import { CalendarEventChip } from '@/calendar/components/CalendarEventChip';
import { type CalendarEventSlot } from '@/calendar/types/CalendarEventSlot';
import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';

type CalendarDayViewProps = {
  day: Temporal.PlainDate;
  spansByDay: Map<string, CalendarEventSpan[]>;
  selectedEventId: string | null;
  timeZone: string;
  locale?: string;
  onSelectEvent: (eventId: string) => void;
  onCreateEventFromSlots: (range: {
    startSlot: CalendarEventSlot;
    endSlot: CalendarEventSlot;
  }) => void;
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
  max-width: 720px;
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
  onCreateEventFromSlots,
}: CalendarDayViewProps) => {
  const { t } = useLingui();
  const daySpans = spansByDay.get(day.toString()) ?? [];
  const allDaySpans = daySpans.filter((span) => span.isAllDay);
  const timedSpans = daySpans.filter((span) => !span.isAllDay);

  return (
    <StyledDay aria-label={t`Day calendar`}>
      <StyledDayHeader>
        {day.toLocaleString(locale, { dateStyle: 'full' })}
      </StyledDayHeader>
      {allDaySpans.length > 0 && (
        <StyledList>
          {allDaySpans.map((span) => (
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
        </StyledList>
      )}
      {daySpans.length === 0 && (
        <StyledEmpty>{t`No events on this day`}</StyledEmpty>
      )}
      <CalendarDayTimeGrid
        day={day}
        timedSpans={timedSpans}
        selectedEventId={selectedEventId}
        timeZone={timeZone}
        locale={locale}
        onSelectEvent={onSelectEvent}
        onCreateEventFromSlots={onCreateEventFromSlots}
      />
    </StyledDay>
  );
};
