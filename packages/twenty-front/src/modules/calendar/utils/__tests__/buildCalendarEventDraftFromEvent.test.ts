import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { buildCalendarEventDraftFromEvent } from '@/calendar/utils/buildCalendarEventDraftFromEvent';

const buildEvent = (
  overrides: Partial<CalendarEventRecord>,
): CalendarEventRecord => ({
  id: 'event-1',
  title: 'Event',
  description: null,
  location: null,
  startsAt: null,
  endsAt: null,
  isFullDay: false,
  isCanceled: false,
  externalCreatedAt: null,
  ...overrides,
});

describe('buildCalendarEventDraftFromEvent', () => {
  it('reads a timed event back in the user time zone', () => {
    const draft = buildCalendarEventDraftFromEvent({
      event: buildEvent({
        startsAt: '2026-07-15T13:00:00Z',
        endsAt: '2026-07-15T14:00:00Z',
      }),
      timeZone: 'America/New_York',
    });

    expect(draft.startDay.toString()).toBe('2026-07-15');
    expect(draft.startHour).toBe(9);
    expect(draft.startMinute).toBe(0);
    expect(draft.endHour).toBe(10);
    expect(draft.isFullDay).toBe(false);
  });

  it('collapses an all-day exclusive end back to an inclusive day', () => {
    const draft = buildCalendarEventDraftFromEvent({
      event: buildEvent({
        isFullDay: true,
        startsAt: '2026-07-15T00:00:00Z',
        endsAt: '2026-07-16T00:00:00Z',
      }),
      timeZone: 'America/New_York',
    });

    expect(draft.isFullDay).toBe(true);
    expect(draft.startDay.toString()).toBe('2026-07-15');
    expect(draft.endDay.toString()).toBe('2026-07-15');
  });

  it('defaults a missing end to one hour after the start', () => {
    const draft = buildCalendarEventDraftFromEvent({
      event: buildEvent({ startsAt: '2026-07-15T09:00:00Z' }),
      timeZone: 'UTC',
    });

    expect(draft.endDay.toString()).toBe('2026-07-15');
    expect(draft.endHour).toBe(10);
  });

  it('falls back to a midnight one-hour draft when there is no start', () => {
    const draft = buildCalendarEventDraftFromEvent({
      event: buildEvent({ startsAt: null }),
      timeZone: 'UTC',
    });

    expect(draft.startHour).toBe(0);
    expect(draft.startMinute).toBe(0);
    expect(draft.endHour).toBe(1);
  });
});
