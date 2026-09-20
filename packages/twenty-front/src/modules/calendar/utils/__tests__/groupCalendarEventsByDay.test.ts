import { Temporal } from 'temporal-polyfill';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { groupCalendarEventsByDay } from '@/calendar/utils/groupCalendarEventsByDay';

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
  ...overrides,
});

const firstDay = Temporal.PlainDate.from('2026-07-13');
const lastDay = Temporal.PlainDate.from('2026-07-19');

const dayKeys = (map: Map<string, unknown[]>): string[] =>
  [...map.keys()].sort();

describe('groupCalendarEventsByDay', () => {
  it('repeats a multi-day event on every covered day', () => {
    const grouped = groupCalendarEventsByDay({
      events: [
        buildEvent({
          id: 'multi-day',
          isFullDay: true,
          startsAt: '2026-07-14',
          endsAt: '2026-07-16',
        }),
      ],
      timeZone: 'UTC',
      firstDay,
      lastDay,
    });

    expect(dayKeys(grouped)).toEqual([
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
    ]);
  });

  it('clips events that start before the range', () => {
    const grouped = groupCalendarEventsByDay({
      events: [
        buildEvent({
          id: 'early',
          isFullDay: true,
          startsAt: '2026-07-10',
          endsAt: '2026-07-14',
        }),
      ],
      timeZone: 'UTC',
      firstDay,
      lastDay,
    });

    expect(dayKeys(grouped)).toEqual(['2026-07-13', '2026-07-14']);
  });

  it('drops events entirely outside the range', () => {
    const grouped = groupCalendarEventsByDay({
      events: [
        buildEvent({
          id: 'outside',
          startsAt: '2026-08-01T10:00:00.000Z',
          endsAt: '2026-08-01T11:00:00.000Z',
        }),
      ],
      timeZone: 'UTC',
      firstDay,
      lastDay,
    });

    expect(grouped.size).toBe(0);
  });

  it('orders all-day events before timed events and timed events by start', () => {
    const grouped = groupCalendarEventsByDay({
      events: [
        buildEvent({
          id: 'late',
          startsAt: '2026-07-15T15:00:00.000Z',
          endsAt: '2026-07-15T16:00:00.000Z',
        }),
        buildEvent({
          id: 'all-day',
          isFullDay: true,
          startsAt: '2026-07-15',
        }),
        buildEvent({
          id: 'early',
          startsAt: '2026-07-15T08:00:00.000Z',
          endsAt: '2026-07-15T09:00:00.000Z',
        }),
      ],
      timeZone: 'UTC',
      firstDay,
      lastDay,
    });

    expect(grouped.get('2026-07-15')?.map((span) => span.event.id)).toEqual([
      'all-day',
      'early',
      'late',
    ]);
  });
});
