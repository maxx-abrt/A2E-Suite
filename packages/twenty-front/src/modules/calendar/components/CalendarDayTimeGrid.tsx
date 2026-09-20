import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type KeyboardEvent, useMemo, useReducer, useRef } from 'react';
import { type Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarEventBlock } from '@/calendar/components/CalendarEventBlock';
import { CALENDAR_DAY_MINUTES } from '@/calendar/constants/CalendarDayMinutes';
import { CALENDAR_SLOTS_PER_DAY } from '@/calendar/constants/CalendarSlotsPerDay';
import { CALENDAR_SLOTS_PER_HOUR } from '@/calendar/constants/CalendarSlotsPerHour';
import { type CalendarEventSlot } from '@/calendar/types/CalendarEventSlot';
import { type CalendarEventSpan } from '@/calendar/types/CalendarEventSpan';
import { getCalendarSlotFromIndex } from '@/calendar/utils/calendarEventSlots';
import {
  getCalendarSlotSelectionRange,
  INITIAL_CALENDAR_SLOT_SELECTION,
  reduceCalendarSlotSelection,
} from '@/calendar/utils/calendarSlotSelection';
import { getCalendarEventDayInterval } from '@/calendar/utils/getCalendarEventDayInterval';
import { layoutCalendarEventOverlaps } from '@/calendar/utils/layoutCalendarEventOverlaps';

type CalendarDayTimeGridProps = {
  day: Temporal.PlainDate;
  timedSpans: CalendarEventSpan[];
  selectedEventId: string | null;
  timeZone: string;
  locale?: string;
  onSelectEvent: (eventId: string) => void;
  onCreateEventFromSlots: (range: {
    startSlot: CalendarEventSlot;
    endSlot: CalendarEventSlot;
  }) => void;
};

const SLOT_HEIGHT_PX = 48;

const StyledGrid = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  max-width: 720px;
  position: relative;
`;

const StyledSlotColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledSlot = styled.button<{ isInSelection: boolean }>`
  align-items: flex-start;
  background: ${({ isInSelection }) =>
    isInSelection
      ? themeCssVariables.background.transparent.medium
      : 'transparent'};
  border: none;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  height: ${SLOT_HEIGHT_PX}px;
  padding: 0 ${themeCssVariables.spacing[1]};
  text-align: left;
  width: 100%;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: -2px;
  }
`;

const StyledEventLayer = styled.div`
  inset: 0;
  pointer-events: none;
  position: absolute;
`;

export const CalendarDayTimeGrid = ({
  day,
  timedSpans,
  selectedEventId,
  timeZone,
  locale,
  onSelectEvent,
  onCreateEventFromSlots,
}: CalendarDayTimeGridProps) => {
  const { t } = useLingui();
  const [selection, dispatch] = useReducer(
    reduceCalendarSlotSelection,
    INITIAL_CALENDAR_SLOT_SELECTION,
  );
  // oxlint-disable-next-line twenty/no-state-useref
  const isPointerSelectingRef = useRef(false);
  // oxlint-disable-next-line twenty/no-state-useref
  const slotElementsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const slotLabels = useMemo(
    () =>
      Array.from({ length: CALENDAR_SLOTS_PER_DAY }, (_, index) =>
        day
          .toPlainDateTime({ hour: index, minute: 0 })
          .toPlainTime()
          .toLocaleString(locale, { timeStyle: 'short' }),
      ),
    [day, locale],
  );

  const layouts = useMemo(() => {
    const intervals = timedSpans
      .map((span) => {
        const interval = getCalendarEventDayInterval({
          event: span.event,
          day,
          timeZone,
        });

        return isDefined(interval)
          ? { eventId: span.event.id, ...interval }
          : null;
      })
      .filter(isDefined);

    return layoutCalendarEventOverlaps({
      intervals,
      dayMinutes: CALENDAR_DAY_MINUTES,
    });
  }, [timedSpans, day, timeZone]);

  const layoutById = useMemo(
    () => new Map(layouts.map((layout) => [layout.eventId, layout])),
    [layouts],
  );

  const selectionRange = getCalendarSlotSelectionRange(selection);

  const getSlotAt = (index: number): CalendarEventSlot =>
    getCalendarSlotFromIndex({
      day,
      index,
      slotsPerHour: CALENDAR_SLOTS_PER_HOUR,
    });

  const commitSelection = () => {
    const range = getCalendarSlotSelectionRange(selection);

    if (!isDefined(range)) {
      return;
    }

    onCreateEventFromSlots({
      startSlot: getSlotAt(range.startIndex),
      endSlot: getSlotAt(range.endIndex),
    });
    dispatch({ type: 'reset' });
  };

  const moveFocus = (nextIndex: number, shouldExtend: boolean) => {
    const clampedIndex = Math.max(
      0,
      Math.min(CALENDAR_SLOTS_PER_DAY - 1, nextIndex),
    );

    dispatch(
      shouldExtend
        ? { type: 'extend', index: clampedIndex }
        : { type: 'focus', index: clampedIndex },
    );
    slotElementsRef.current[clampedIndex]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = selection.focusIndex ?? 0;

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveFocus(currentIndex + 1, event.shiftKey);

      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveFocus(currentIndex - 1, event.shiftKey);

      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      if (isDefined(selection.anchorIndex)) {
        commitSelection();
      } else {
        dispatch({ type: 'start', index: currentIndex });
      }

      return;
    }

    if (event.key === 'Escape') {
      dispatch({ type: 'reset' });
    }
  };

  return (
    <StyledGrid
      role="grid"
      aria-label={t`Create event`}
      data-testid="calendar-day-grid"
      onKeyDown={handleKeyDown}
    >
      <StyledSlotColumn>
        {slotLabels.map((label, index) => (
          <StyledSlot
            key={label}
            ref={(element) => {
              slotElementsRef.current[index] = element;
            }}
            type="button"
            tabIndex={index === (selection.focusIndex ?? 0) ? 0 : -1}
            isInSelection={
              isDefined(selectionRange) &&
              index >= selectionRange.startIndex &&
              index <= selectionRange.endIndex
            }
            aria-label={t`Create event at ${label}`}
            data-testid={`calendar-slot-${index}`}
            onClick={commitSelection}
            onPointerDown={() => {
              isPointerSelectingRef.current = true;
              dispatch({ type: 'start', index });
            }}
            onPointerEnter={() => {
              if (isPointerSelectingRef.current) {
                dispatch({ type: 'extend', index });
              }
            }}
            onPointerUp={() => {
              isPointerSelectingRef.current = false;
            }}
          >
            {label}
          </StyledSlot>
        ))}
      </StyledSlotColumn>
      <StyledEventLayer>
        {timedSpans.map((span) => {
          const layout = layoutById.get(span.event.id);

          if (!isDefined(layout)) {
            return null;
          }

          return (
            <CalendarEventBlock
              key={span.event.id}
              span={span}
              layout={layout}
              isSelected={span.event.id === selectedEventId}
              timeZone={timeZone}
              locale={locale}
              onSelect={onSelectEvent}
            />
          );
        })}
      </StyledEventLayer>
    </StyledGrid>
  );
};
