import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarAgendaView } from '@/calendar/components/CalendarAgendaView';
import { CalendarDayView } from '@/calendar/components/CalendarDayView';
import { CalendarEventDetails } from '@/calendar/components/CalendarEventDetails';
import { CalendarMonthView } from '@/calendar/components/CalendarMonthView';
import { CalendarToolbar } from '@/calendar/components/CalendarToolbar';
import { CalendarWeekView } from '@/calendar/components/CalendarWeekView';
import { useCalendarEvents } from '@/calendar/hooks/useCalendarEvents';
import { type CalendarViewMode } from '@/calendar/types/CalendarViewMode';
import { getCalendarViewDays } from '@/calendar/utils/getCalendarViewDays';
import { groupCalendarEventsByDay } from '@/calendar/utils/groupCalendarEventsByDay';
import { navigateCalendarAnchor } from '@/calendar/utils/navigateCalendarAnchor';
import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { dateLocaleState } from '~/localization/states/dateLocaleState';
import { formatRecordCalendarWeekRange } from '@/object-record/record-calendar/utils/formatRecordCalendarWeekRange';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

const StyledPage = styled.div`
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;

const StyledStatus = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const StyledError = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

export const CalendarPage = () => {
  const { t } = useLingui();
  const { timeZone, calendarStartDay } = useDateTimeFormat();
  const dateLocale = useAtomStateValue(dateLocaleState);
  const { events, loading, error, refetch } = useCalendarEvents();

  const [mode, setMode] = useState<CalendarViewMode>('month');
  const [anchorDate, setAnchorDate] = useState<Temporal.PlainDate>(() =>
    Temporal.Now.plainDateISO(timeZone),
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const {
    days: viewDays,
    firstDay,
    lastDay,
  } = useMemo(
    () =>
      getCalendarViewDays({
        mode,
        anchorDate,
        weekStartsOnDayIndex: calendarStartDay,
      }),
    [mode, anchorDate, calendarStartDay],
  );

  const spansByDay = useMemo(
    () =>
      groupCalendarEventsByDay({
        events,
        timeZone,
        firstDay,
        lastDay,
      }),
    [events, timeZone, firstDay, lastDay],
  );

  const agendaDays = useMemo(() => {
    const firstDayOfMonth = anchorDate.with({ day: 1 });

    return Array.from({ length: anchorDate.daysInMonth }, (_, index) =>
      firstDayOfMonth.add({ days: index }),
    );
  }, [anchorDate]);

  const eventsInRangeCount = useMemo(() => {
    const eventIds = new Set<string>();

    spansByDay.forEach((daySpans) => {
      daySpans.forEach((span) => eventIds.add(span.event.id));
    });

    return eventIds.size;
  }, [spansByDay]);

  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? null;
  const selectedSpan = isDefined(selectedEventId)
    ? Array.from(spansByDay.values())
        .flat()
        .find((span) => span.event.id === selectedEventId)
    : undefined;

  const title = useMemo(() => {
    if (mode === 'week') {
      return formatRecordCalendarWeekRange({
        firstDayOfWeek: firstDay,
        lastDayOfWeek: lastDay,
        locale: dateLocale.localeCatalog,
      });
    }

    if (mode === 'day') {
      return anchorDate.toLocaleString(dateLocale.locale, {
        dateStyle: 'full',
      });
    }

    return anchorDate.toLocaleString(dateLocale.locale, {
      month: 'long',
      year: 'numeric',
    });
  }, [
    mode,
    anchorDate,
    firstDay,
    lastDay,
    dateLocale.locale,
    dateLocale.localeCatalog,
  ]);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleModeChange = (nextMode: CalendarViewMode) => {
    setMode(nextMode);
    setSelectedEventId(null);
  };

  const handlePrevious = () => {
    setAnchorDate((currentAnchor) =>
      navigateCalendarAnchor({
        mode,
        anchorDate: currentAnchor,
        direction: 'previous',
      }),
    );
  };

  const handleNext = () => {
    setAnchorDate((currentAnchor) =>
      navigateCalendarAnchor({
        mode,
        anchorDate: currentAnchor,
        direction: 'next',
      }),
    );
  };

  const handleToday = () => {
    setAnchorDate(Temporal.Now.plainDateISO(timeZone));
  };

  const hasError = isDefined(error);
  const errorMessage = isGraphqlErrorOfType(error, 'FORBIDDEN')
    ? t`You do not have access to calendar events`
    : t`Could not load calendar events`;

  return (
    <StyledPage data-testid="calendar-page">
      <CalendarToolbar
        mode={mode}
        title={title}
        onModeChange={handleModeChange}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
      />
      {isDefined(selectedEvent) && (
        <CalendarEventDetails
          event={selectedEvent}
          isAllDay={selectedSpan?.isAllDay ?? selectedEvent.isFullDay}
          timeZone={timeZone}
          locale={dateLocale.locale}
          onClose={() => setSelectedEventId(null)}
        />
      )}
      <StyledContent>
        {loading && events.length === 0 ? (
          <StyledStatus>{t`Loading…`}</StyledStatus>
        ) : hasError ? (
          <StyledError>
            <StyledStatus>{errorMessage}</StyledStatus>
            <Button
              title={t`Retry`}
              size="small"
              variant="secondary"
              onClick={() => refetch()}
            />
          </StyledError>
        ) : (
          <>
            {mode === 'month' && (
              <CalendarMonthView
                weeks={viewDays}
                anchorMonth={anchorDate.month}
                spansByDay={spansByDay}
                selectedEventId={selectedEventId}
                timeZone={timeZone}
                locale={dateLocale.locale}
                onSelectEvent={handleSelectEvent}
              />
            )}
            {mode === 'week' && (
              <CalendarWeekView
                days={viewDays.flat()}
                spansByDay={spansByDay}
                selectedEventId={selectedEventId}
                timeZone={timeZone}
                locale={dateLocale.locale}
                onSelectEvent={handleSelectEvent}
              />
            )}
            {mode === 'day' && (
              <CalendarDayView
                day={anchorDate}
                spansByDay={spansByDay}
                selectedEventId={selectedEventId}
                timeZone={timeZone}
                locale={dateLocale.locale}
                onSelectEvent={handleSelectEvent}
              />
            )}
            {mode === 'agenda' && (
              <CalendarAgendaView
                days={agendaDays}
                spansByDay={spansByDay}
                selectedEventId={selectedEventId}
                timeZone={timeZone}
                locale={dateLocale.locale}
                onSelectEvent={handleSelectEvent}
              />
            )}
            {eventsInRangeCount === 0 && mode === 'month' && (
              <StyledStatus>{t`No events in this range`}</StyledStatus>
            )}
          </>
        )}
      </StyledContent>
    </StyledPage>
  );
};
