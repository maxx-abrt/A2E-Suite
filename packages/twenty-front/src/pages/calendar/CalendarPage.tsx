import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useMemo, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { v4 } from 'uuid';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarAgendaView } from '@/calendar/components/CalendarAgendaView';
import { CalendarDayView } from '@/calendar/components/CalendarDayView';
import { CalendarEventComposer } from '@/calendar/components/CalendarEventComposer';
import { CalendarEventDetails } from '@/calendar/components/CalendarEventDetails';
import { CalendarMonthView } from '@/calendar/components/CalendarMonthView';
import { CalendarSeriesScopeDialog } from '@/calendar/components/CalendarSeriesScopeDialog';
import { CalendarTaskQuickCreateDialog } from '@/calendar/components/CalendarTaskQuickCreateDialog';
import { CalendarToolbar } from '@/calendar/components/CalendarToolbar';
import { CalendarWeekView } from '@/calendar/components/CalendarWeekView';
import { useCalendarEventMutations } from '@/calendar/hooks/useCalendarEventMutations';
import { useCalendarEvents } from '@/calendar/hooks/useCalendarEvents';
import { useCalendarTaskDueDates } from '@/calendar/hooks/useCalendarTaskDueDates';
import { useCalendarTaskQuickCreate } from '@/calendar/hooks/useCalendarTaskQuickCreate';
import {
  type CalendarEventDraft,
  type CalendarEventInput,
} from '@/calendar/types/CalendarEventDraft';
import { type CalendarRecurrenceDraft } from '@/calendar/types/CalendarRecurrenceDraft';
import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { type CalendarEventSlot } from '@/calendar/types/CalendarEventSlot';
import { type CalendarSeriesEditScope } from '@/calendar/types/CalendarSeriesEditScope';
import { type CalendarViewMode } from '@/calendar/types/CalendarViewMode';
import { buildCalendarEventDraftFromEvent } from '@/calendar/utils/buildCalendarEventDraftFromEvent';
import { buildCalendarEventDraftFromSlotRange } from '@/calendar/utils/calendarEventSlots';
import { buildCalendarEventInputFromDraft } from '@/calendar/utils/buildCalendarEventInputFromDraft';
import { buildCalendarQuickTaskInput } from '@/calendar/utils/buildCalendarQuickTaskInput';
import { buildCalendarRecurrenceRuleFromDraft } from '@/calendar/utils/buildCalendarRecurrenceRuleFromDraft';
import {
  buildCalendarSeriesAnchorInputFromDraft,
  getCalendarSeriesTimeZone,
} from '@/calendar/utils/buildCalendarSeriesAnchorInputFromDraft';
import { expandCalendarEventsForRange } from '@/calendar/utils/expandCalendarEventsForRange';
import { getCalendarEventOccurrenceDay } from '@/calendar/utils/getCalendarEventOccurrenceDay';
import { getCalendarSeriesEvents } from '@/calendar/utils/getCalendarSeriesEvents';
import { getCalendarViewDays } from '@/calendar/utils/getCalendarViewDays';
import { groupCalendarEventsByDay } from '@/calendar/utils/groupCalendarEventsByDay';
import { groupCalendarTaskDuesByDay } from '@/calendar/utils/groupCalendarTaskDuesByDay';
import { isCalendarLocalEditSurface } from '@/calendar/utils/isCalendarLocalEditSurface';
import { isLocalCalendarEvent } from '@/calendar/utils/isLocalCalendarEvent';
import { navigateCalendarAnchor } from '@/calendar/utils/navigateCalendarAnchor';
import { parseCalendarRecurrenceRule } from '@/calendar/utils/parseCalendarRecurrenceRule';
import {
  planCalendarOccurrenceDelete,
  planCalendarOccurrenceEdit,
  planCalendarSeriesDelete,
  planCalendarSeriesEdit,
} from '@/calendar/utils/planCalendarSeriesMutations';
import { shouldPromptCalendarSeriesScope } from '@/calendar/utils/shouldPromptCalendarSeriesScope';
import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { dateLocaleState } from '~/localization/states/dateLocaleState';
import { formatRecordCalendarWeekRange } from '@/object-record/record-calendar/utils/formatRecordCalendarWeekRange';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
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
  const {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    deleteCalendarEvents,
    isSaving,
    error: mutationError,
    resetError,
  } = useCalendarEventMutations();

  const [mode, setMode] = useState<CalendarViewMode>('month');
  const [anchorDate, setAnchorDate] = useState<Temporal.PlainDate>(() =>
    Temporal.Now.plainDateISO(timeZone),
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [composer, setComposer] = useState<{
    mode: 'create' | 'edit';
    eventId: string | null;
    draft: CalendarEventDraft;
    // null for create and for a plain single-event edit; set when the user
    // picked a scope in the recurring-event dialog.
    editScope: CalendarSeriesEditScope | null;
    occurrenceDay: string | null;
  } | null>(null);
  const [scopePrompt, setScopePrompt] = useState<{
    action: 'edit' | 'delete';
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showTaskDueDates, setShowTaskDueDates] = useState(true);
  const [taskQuickCreate, setTaskQuickCreate] = useState<{
    dueDay: Temporal.PlainDate;
    title: string;
  } | null>(null);
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const {
    canCreateTasks,
    createTask,
    isCreating: isCreatingTask,
    error: taskCreateError,
    resetError: resetTaskCreateError,
  } = useCalendarTaskQuickCreate();

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

  // Series anchors are expanded into their occurrences for the visible range;
  // every write below still resolves back to the stored anchor/detached rows.
  const { events: displayedEvents, occurrenceSourceByEventId } = useMemo(
    () =>
      expandCalendarEventsForRange({
        events,
        timeZone,
        firstDay,
        lastDay,
        weekStartsOnDayIndex: calendarStartDay,
      }),
    [events, timeZone, firstDay, lastDay, calendarStartDay],
  );

  const spansByDay = useMemo(
    () =>
      groupCalendarEventsByDay({
        events: displayedEvents,
        timeZone,
        firstDay,
        lastDay,
      }),
    [displayedEvents, timeZone, firstDay, lastDay],
  );

  // Task deadlines are a read-only overlay: they come from standard `task`
  // rows, render apart from events, and open the task itself (never an event).
  const {
    tasks: dueTasks,
    error: taskDueError,
    refetch: refetchTaskDues,
  } = useCalendarTaskDueDates({
    firstDay,
    lastDay,
    timeZone,
    skip: !showTaskDueDates,
  });

  const taskDuesByDay = useMemo(
    () =>
      groupCalendarTaskDuesByDay({
        tasks: dueTasks,
        timeZone,
        firstDay,
        lastDay,
        today: Temporal.Now.plainDateISO(timeZone),
      }),
    [dueTasks, timeZone, firstDay, lastDay],
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

  const taskDuesInRangeCount = useMemo(
    () =>
      Array.from(taskDuesByDay.values()).reduce(
        (count, dayTaskDues) => count + dayTaskDues.length,
        0,
      ),
    [taskDuesByDay],
  );

  // The displayed event may be an expanded occurrence (view-only id); the
  // stored event is the row writes must target — its anchor for an occurrence.
  const selectedEvent =
    displayedEvents.find((event) => event.id === selectedEventId) ?? null;
  const selectedOccurrenceSource = isDefined(selectedEventId)
    ? (occurrenceSourceByEventId.get(selectedEventId) ?? null)
    : null;
  const selectedStoredEventId =
    selectedOccurrenceSource?.anchorEventId ?? selectedEventId;
  const selectedStoredEvent =
    events.find((event) => event.id === selectedStoredEventId) ?? null;
  const selectedSpan = isDefined(selectedEventId)
    ? Array.from(spansByDay.values())
        .flat()
        .find((span) => span.event.id === selectedEventId)
    : undefined;

  // All stored rows of the selected event's series. The anchor carries the
  // rule; detached siblings share the series id and name the day they replace.
  const selectedSeriesEvents = useMemo(
    () =>
      isDefined(selectedStoredEvent)
        ? getCalendarSeriesEvents({ event: selectedStoredEvent, events })
        : { anchorEvent: null, detachedEvents: [] },
    [events, selectedStoredEvent],
  );

  const selectedSeriesAnchor = selectedSeriesEvents.anchorEvent;
  const selectedSeriesDetachedEvents = selectedSeriesEvents.detachedEvents;

  // An expanded occurrence names its day directly; a stored anchor or detached
  // row derives it from its own columns.
  const getSelectedOccurrenceDay = (): string | null => {
    if (isDefined(selectedOccurrenceSource)) {
      return selectedOccurrenceSource.occurrenceDay;
    }

    if (!isDefined(selectedStoredEvent)) {
      return null;
    }

    return getCalendarEventOccurrenceDay({
      event: selectedStoredEvent,
      timeZone,
    });
  };

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

  const handleOpenTask = (taskId: string) => {
    openRecordInSidePanel({
      recordId: taskId,
      objectNameSingular: CoreObjectNameSingular.Task,
    });
  };

  const handleAddTask = (dueDay: Temporal.PlainDate) => {
    resetTaskCreateError();
    setStatusMessage(null);
    setTaskQuickCreate({ dueDay, title: '' });
  };

  const handleTaskQuickCreateSubmit = async () => {
    if (!isDefined(taskQuickCreate)) {
      return;
    }

    const input = buildCalendarQuickTaskInput({
      taskId: v4(),
      title: taskQuickCreate.title,
      dueDay: taskQuickCreate.dueDay,
      timeZone,
    });

    if (!isDefined(input)) {
      return;
    }

    const didCreate = await createTask(input);

    if (didCreate) {
      setTaskQuickCreate(null);
      setStatusMessage(t`Task created`);
      refetchTaskDues();
    }
  };

  // Quick-create belongs to the deadline overlay: hidden with it, and never
  // offered to a member who cannot create tasks.
  const onAddTask =
    showTaskDueDates && canCreateTasks ? handleAddTask : undefined;

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

  const handleCreateEventFromSlots = ({
    startSlot,
    endSlot,
  }: {
    startSlot: CalendarEventSlot;
    endSlot: CalendarEventSlot;
  }) => {
    resetError();
    setStatusMessage(null);
    setComposer({
      mode: 'create',
      eventId: null,
      editScope: null,
      occurrenceDay: null,
      draft: buildCalendarEventDraftFromSlotRange({ startSlot, endSlot }),
    });
  };

  const openComposerForEvent = ({
    event,
    editScope,
    occurrenceDay,
  }: {
    event: CalendarEventRecord;
    editScope: CalendarSeriesEditScope | null;
    occurrenceDay: string | null;
  }) => {
    setComposer({
      mode: 'edit',
      eventId: event.id,
      editScope,
      occurrenceDay,
      draft: buildCalendarEventDraftFromEvent({ event, timeZone }),
    });
  };

  const handleEditSelectedEvent = () => {
    if (!isDefined(selectedEvent)) {
      return;
    }

    resetError();
    setStatusMessage(null);

    if (
      shouldPromptCalendarSeriesScope({ event: selectedEvent, viewMode: mode })
    ) {
      setScopePrompt({ action: 'edit' });
      return;
    }

    openComposerForEvent({
      event: selectedEvent,
      editScope: null,
      occurrenceDay: null,
    });
  };

  const updateOccurrence = async ({
    occurrenceDay,
    input,
  }: {
    occurrenceDay: string;
    input: CalendarEventInput;
  }): Promise<boolean> => {
    if (!isDefined(selectedSeriesAnchor)) {
      setStatusMessage(t`Could not update this occurrence`);
      return false;
    }

    const plan = planCalendarOccurrenceEdit({
      anchorEvent: selectedSeriesAnchor,
      detachedEvents: selectedSeriesDetachedEvents,
      occurrenceDay,
      eventInput: input,
    });

    if (!isDefined(plan)) {
      setStatusMessage(t`Could not update this occurrence`);
      return false;
    }

    const didUpsert = isDefined(plan.detachedEventId)
      ? await updateCalendarEvent({
          id: plan.detachedEventId,
          input: plan.detachedInput,
        })
      : await createCalendarEvent(plan.detachedInput);

    if (!didUpsert) {
      return false;
    }

    if (isDefined(plan.anchorUpdate)) {
      const didUpdateAnchor = await updateCalendarEvent({
        id: plan.anchorUpdate.id,
        input: plan.anchorUpdate.input,
      });

      if (!didUpdateAnchor) {
        return false;
      }
    }

    setStatusMessage(t`Event updated`);
    refetch();

    return true;
  };

  const updateSeries = async ({
    input,
    recurrence,
    startDay,
  }: {
    input: CalendarEventInput;
    recurrence: CalendarRecurrenceDraft | null;
    startDay: Temporal.PlainDate;
  }): Promise<boolean> => {
    if (!isDefined(selectedSeriesAnchor)) {
      setStatusMessage(t`Could not update this series`);
      return false;
    }

    // The composer's "Repeat" draft wins; without one the stored rule is kept.
    const rule = isDefined(recurrence)
      ? buildCalendarRecurrenceRuleFromDraft({
          recurrence,
          startDay,
          seriesTimeZone: selectedSeriesAnchor.isFullDay
            ? getCalendarSeriesTimeZone({ isFullDay: true, timeZone })
            : isNonEmptyString(selectedSeriesAnchor.recurrenceTimezone)
              ? selectedSeriesAnchor.recurrenceTimezone
              : timeZone,
        })
      : isNonEmptyString(selectedSeriesAnchor.recurrenceRule)
        ? parseCalendarRecurrenceRule(selectedSeriesAnchor.recurrenceRule)
        : null;

    if (rule === null) {
      setStatusMessage(t`Could not update this series`);
      return false;
    }

    const plan = planCalendarSeriesEdit({
      anchorEvent: selectedSeriesAnchor,
      detachedEvents: selectedSeriesDetachedEvents,
      rule,
      seriesStart: input.startsAt,
      eventInput: input,
    });

    if (!isDefined(plan)) {
      setStatusMessage(t`Could not update this series`);
      return false;
    }

    const didUpdate = await updateCalendarEvent({
      id: plan.anchorId,
      input: plan.anchorInput,
    });

    if (didUpdate) {
      setStatusMessage(t`Event updated`);
      refetch();
    }

    return didUpdate;
  };

  const deleteOccurrence = async (occurrenceDay: string): Promise<boolean> => {
    if (!isDefined(selectedSeriesAnchor)) {
      setStatusMessage(t`Could not delete this occurrence`);
      return false;
    }

    const plan = planCalendarOccurrenceDelete({
      anchorEvent: selectedSeriesAnchor,
      detachedEvents: selectedSeriesDetachedEvents,
      occurrenceDay,
    });

    if (!isDefined(plan)) {
      setStatusMessage(t`Could not delete this occurrence`);
      return false;
    }

    if (isDefined(plan.detachedEventId)) {
      const didDeleteDetached = await deleteCalendarEvent(plan.detachedEventId);

      if (!didDeleteDetached) {
        return false;
      }
    }

    if (isDefined(plan.anchorUpdate)) {
      const didUpdateAnchor = await updateCalendarEvent({
        id: plan.anchorUpdate.id,
        input: plan.anchorUpdate.input,
      });

      if (!didUpdateAnchor) {
        return false;
      }
    }

    setStatusMessage(t`Event deleted`);
    refetch();

    return true;
  };

  const deleteSeries = async (): Promise<boolean> => {
    if (!isDefined(selectedSeriesAnchor)) {
      setStatusMessage(t`Could not delete this series`);
      return false;
    }

    const plan = planCalendarSeriesDelete({
      anchorEvent: selectedSeriesAnchor,
      detachedEvents: selectedSeriesDetachedEvents,
    });

    if (!isDefined(plan)) {
      setStatusMessage(t`Could not delete this series`);
      return false;
    }

    const didDelete = await deleteCalendarEvents(plan.seriesDeleteIds);

    if (didDelete) {
      setStatusMessage(t`Event deleted`);
      refetch();
    }

    return didDelete;
  };

  const handleDeleteSelectedEvent = async () => {
    if (!isDefined(selectedEvent)) {
      return;
    }

    resetError();
    setStatusMessage(null);

    if (
      shouldPromptCalendarSeriesScope({ event: selectedEvent, viewMode: mode })
    ) {
      setScopePrompt({ action: 'delete' });
      return;
    }

    if (!isDefined(selectedStoredEvent)) {
      return;
    }

    const didDelete = await deleteCalendarEvent(selectedStoredEvent.id);

    if (didDelete) {
      setSelectedEventId(null);
      setStatusMessage(t`Event deleted`);
      refetch();
    }
  };

  const handleChooseScope = (scope: CalendarSeriesEditScope) => {
    if (!isDefined(selectedEvent) || !isDefined(scopePrompt)) {
      return;
    }

    const action = scopePrompt.action;
    setScopePrompt(null);

    if (action === 'edit') {
      if (scope === 'this-occurrence') {
        const occurrenceDay = getSelectedOccurrenceDay();

        if (!isDefined(occurrenceDay)) {
          setStatusMessage(t`Could not edit this occurrence`);
          return;
        }

        openComposerForEvent({
          event: selectedEvent,
          editScope: 'this-occurrence',
          occurrenceDay,
        });
        return;
      }

      openComposerForEvent({
        event: selectedSeriesAnchor ?? selectedStoredEvent ?? selectedEvent,
        editScope: 'whole-series',
        occurrenceDay: null,
      });
      return;
    }

    if (scope === 'this-occurrence') {
      const occurrenceDay = getSelectedOccurrenceDay();

      if (!isDefined(occurrenceDay)) {
        setStatusMessage(t`Could not delete this occurrence`);
        return;
      }

      void deleteOccurrence(occurrenceDay).then((didDelete) => {
        if (didDelete) {
          setSelectedEventId(null);
        }
      });
      return;
    }

    void deleteSeries().then((didDelete) => {
      if (didDelete) {
        setSelectedEventId(null);
      }
    });
  };

  const handleComposerSubmit = async () => {
    if (!isDefined(composer)) {
      return;
    }

    const input = buildCalendarEventInputFromDraft({
      draft: composer.draft,
      timeZone,
    });

    if (composer.mode === 'create') {
      const anchorEventId = v4();
      const seriesAnchorInput = buildCalendarSeriesAnchorInputFromDraft({
        draft: composer.draft,
        timeZone,
        seriesAnchorEventId: anchorEventId,
      });
      const didCreate = await createCalendarEvent(
        isDefined(seriesAnchorInput)
          ? {
              ...input,
              ...seriesAnchorInput,
              id: anchorEventId,
              recurrenceSkippedOccurrenceDays: null,
            }
          : input,
      );

      if (didCreate) {
        setComposer(null);
        setStatusMessage(t`Event created`);
        refetch();
      }

      return;
    }

    if (
      composer.editScope === 'this-occurrence' &&
      isDefined(composer.occurrenceDay)
    ) {
      const didUpdateOccurrence = await updateOccurrence({
        occurrenceDay: composer.occurrenceDay,
        input,
      });

      if (didUpdateOccurrence) {
        setComposer(null);
        setSelectedEventId(null);
      }

      return;
    }

    if (composer.editScope === 'whole-series') {
      const didUpdateSeries = await updateSeries({
        input,
        recurrence: composer.draft.recurrence ?? null,
        startDay: composer.draft.startDay,
      });

      if (didUpdateSeries) {
        setComposer(null);
      }

      return;
    }

    if (!isDefined(composer.eventId)) {
      return;
    }

    // A plain event given a "Repeat" choice becomes the anchor of a new series.
    const seriesAnchorInput = buildCalendarSeriesAnchorInputFromDraft({
      draft: composer.draft,
      timeZone,
      seriesAnchorEventId: composer.eventId,
    });
    const didUpdate = await updateCalendarEvent({
      id: composer.eventId,
      input: isDefined(seriesAnchorInput)
        ? { ...input, ...seriesAnchorInput }
        : input,
    });

    if (didUpdate) {
      setComposer(null);
      setStatusMessage(t`Event updated`);
      refetch();
    }
  };

  const handleComposerDelete = async () => {
    if (!isDefined(composer?.eventId)) {
      return;
    }

    if (
      composer.editScope === 'this-occurrence' &&
      isDefined(composer.occurrenceDay)
    ) {
      const didDelete = await deleteOccurrence(composer.occurrenceDay);

      if (didDelete) {
        setComposer(null);
        setSelectedEventId(null);
      }

      return;
    }

    if (composer.editScope === 'whole-series') {
      const didDelete = await deleteSeries();

      if (didDelete) {
        setComposer(null);
        setSelectedEventId(null);
      }

      return;
    }

    const didDelete = await deleteCalendarEvent(composer.eventId);

    if (didDelete) {
      setComposer(null);
      setSelectedEventId(null);
      setStatusMessage(t`Event deleted`);
      refetch();
    }
  };

  const hasError = isDefined(error);
  const errorMessage = isGraphqlErrorOfType(error, 'FORBIDDEN')
    ? t`You do not have access to calendar events`
    : t`Could not load calendar events`;
  const taskCreateErrorMessage = isDefined(taskCreateError)
    ? isGraphqlErrorOfType(taskCreateError, 'FORBIDDEN')
      ? t`You do not have permission to create tasks`
      : t`Could not create the task. Please try again.`
    : null;
  const composerErrorMessage = isDefined(mutationError)
    ? isGraphqlErrorOfType(mutationError, 'FORBIDDEN')
      ? t`You do not have permission to change this event`
      : t`Could not save the event. Please try again.`
    : null;

  return (
    <StyledPage data-testid="calendar-page">
      <CalendarToolbar
        mode={mode}
        title={title}
        onModeChange={handleModeChange}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        showTaskDueDates={showTaskDueDates}
        onToggleTaskDueDates={() => setShowTaskDueDates((isShown) => !isShown)}
      />
      {isDefined(selectedEvent) && (
        <CalendarEventDetails
          event={selectedEvent}
          isAllDay={selectedSpan?.isAllDay ?? selectedEvent.isFullDay}
          isLocal={isLocalCalendarEvent(selectedEvent)}
          isEditable={isCalendarLocalEditSurface(mode)}
          timeZone={timeZone}
          locale={dateLocale.locale}
          onClose={() => setSelectedEventId(null)}
          onEdit={handleEditSelectedEvent}
          onDelete={() => void handleDeleteSelectedEvent()}
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
                taskDuesByDay={taskDuesByDay}
                selectedEventId={selectedEventId}
                timeZone={timeZone}
                locale={dateLocale.locale}
                onSelectEvent={handleSelectEvent}
                onOpenTask={handleOpenTask}
              />
            )}
            {mode === 'week' && (
              <CalendarWeekView
                days={viewDays.flat()}
                spansByDay={spansByDay}
                taskDuesByDay={taskDuesByDay}
                selectedEventId={selectedEventId}
                timeZone={timeZone}
                locale={dateLocale.locale}
                onSelectEvent={handleSelectEvent}
                onOpenTask={handleOpenTask}
                onAddTask={onAddTask}
              />
            )}
            {mode === 'day' && (
              <CalendarDayView
                day={anchorDate}
                spansByDay={spansByDay}
                taskDuesByDay={taskDuesByDay}
                selectedEventId={selectedEventId}
                timeZone={timeZone}
                locale={dateLocale.locale}
                onSelectEvent={handleSelectEvent}
                onOpenTask={handleOpenTask}
                onAddTask={onAddTask}
                onCreateEventFromSlots={handleCreateEventFromSlots}
              />
            )}
            {mode === 'agenda' && (
              <CalendarAgendaView
                days={agendaDays}
                spansByDay={spansByDay}
                taskDuesByDay={taskDuesByDay}
                selectedEventId={selectedEventId}
                timeZone={timeZone}
                locale={dateLocale.locale}
                onSelectEvent={handleSelectEvent}
                onOpenTask={handleOpenTask}
              />
            )}
            {eventsInRangeCount === 0 &&
              taskDuesInRangeCount === 0 &&
              mode === 'month' && (
                <StyledStatus>{t`No events in this range`}</StyledStatus>
              )}
            {isDefined(taskDueError) && (
              <StyledStatus data-testid="calendar-task-due-error">
                {t`Could not load task due dates`}
              </StyledStatus>
            )}
          </>
        )}
      </StyledContent>
      {isDefined(statusMessage) && (
        <StyledStatus aria-live="polite">{statusMessage}</StyledStatus>
      )}
      {isDefined(scopePrompt) && isDefined(selectedEvent) && (
        <CalendarSeriesScopeDialog
          action={scopePrompt.action}
          eventTitle={selectedEvent.title}
          isSaving={isSaving}
          onChooseScope={handleChooseScope}
          onCancel={() => {
            resetError();
            setScopePrompt(null);
          }}
        />
      )}
      {isDefined(taskQuickCreate) && (
        <CalendarTaskQuickCreateDialog
          dueDay={taskQuickCreate.dueDay}
          title={taskQuickCreate.title}
          locale={dateLocale.locale}
          isCreating={isCreatingTask}
          errorMessage={taskCreateErrorMessage}
          onTitleChange={(title) =>
            setTaskQuickCreate({ ...taskQuickCreate, title })
          }
          onSubmit={() => void handleTaskQuickCreateSubmit()}
          onCancel={() => {
            resetTaskCreateError();
            setTaskQuickCreate(null);
          }}
        />
      )}
      {isDefined(composer) && (
        <CalendarEventComposer
          mode={composer.mode}
          draft={composer.draft}
          recurrenceMode={
            composer.editScope === 'whole-series'
              ? 'series'
              : composer.editScope === 'this-occurrence'
                ? 'hidden'
                : 'optional'
          }
          locale={dateLocale.locale}
          isSaving={isSaving}
          errorMessage={composerErrorMessage}
          onChange={(draft) => setComposer({ ...composer, draft })}
          onSubmit={() => void handleComposerSubmit()}
          onCancel={() => {
            resetError();
            setComposer(null);
          }}
          onDelete={
            composer.mode === 'edit'
              ? () => void handleComposerDelete()
              : undefined
          }
        />
      )}
    </StyledPage>
  );
};
