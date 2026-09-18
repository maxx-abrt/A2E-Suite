import {
  selectUpcomingEvents,
  type HomeCalendarEventSummary,
} from '@/home-dashboard/utils/selectUpcomingEvents';

const buildEvent = (
  overrides: Partial<HomeCalendarEventSummary> & { id: string },
): HomeCalendarEventSummary => ({
  title: 'Event',
  startsAt: '2026-09-18T10:00:00.000Z',
  endsAt: null,
  isFullDay: false,
  ...overrides,
});

describe('selectUpcomingEvents', () => {
  it('keeps only future events sorted by start time', () => {
    const now = new Date(2026, 8, 18, 12);

    const events = [
      buildEvent({ id: 'past', startsAt: '2026-09-18T09:00:00.000Z' }),
      buildEvent({ id: 'later', startsAt: '2026-09-19T09:00:00.000Z' }),
      buildEvent({ id: 'sooner', startsAt: '2026-09-18T15:00:00.000Z' }),
    ];

    expect(
      selectUpcomingEvents(events, { now, limit: 10 }).map((event) => event.id),
    ).toEqual(['sooner', 'later']);
  });

  it('honours the limit', () => {
    const now = new Date(2026, 8, 18, 12);
    const events = [
      buildEvent({ id: 'first', startsAt: '2026-09-18T13:00:00.000Z' }),
      buildEvent({ id: 'second', startsAt: '2026-09-18T14:00:00.000Z' }),
    ];

    expect(
      selectUpcomingEvents(events, { now, limit: 1 }).map((event) => event.id),
    ).toEqual(['first']);
  });
});
