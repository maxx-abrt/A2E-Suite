import {
  CALENDAR_EVENT_COLOR_COUNT,
  getCalendarEventColorIndex,
} from '@/calendar/utils/getCalendarEventColorIndex';

describe('getCalendarEventColorIndex', () => {
  it('is deterministic for the same id', () => {
    expect(getCalendarEventColorIndex('event-123')).toBe(
      getCalendarEventColorIndex('event-123'),
    );
  });

  it('always returns an index inside the palette', () => {
    const ids = ['a', 'b', 'c', 'event-1', '', 'a-very-long-identifier-123456'];

    ids.forEach((id) => {
      const index = getCalendarEventColorIndex(id);

      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(CALENDAR_EVENT_COLOR_COUNT);
    });
  });

  it('separates two different ids', () => {
    expect(getCalendarEventColorIndex('event-a')).not.toBe(
      getCalendarEventColorIndex('event-b'),
    );
  });
});
