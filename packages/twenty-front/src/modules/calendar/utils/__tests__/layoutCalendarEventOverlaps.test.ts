import { layoutCalendarEventOverlaps } from '@/calendar/utils/layoutCalendarEventOverlaps';

describe('layoutCalendarEventOverlaps', () => {
  it('gives sequential events the full width', () => {
    const layouts = layoutCalendarEventOverlaps({
      intervals: [
        { eventId: 'a', startMinutes: 540, endMinutes: 600 },
        { eventId: 'b', startMinutes: 600, endMinutes: 660 },
      ],
      dayMinutes: 1440,
    });

    expect(layouts).toHaveLength(2);
    layouts.forEach((layout) => {
      expect(layout.columnIndex).toBe(0);
      expect(layout.columnCount).toBe(1);
    });
  });

  it('splits two overlapping events into two lanes', () => {
    const layouts = layoutCalendarEventOverlaps({
      intervals: [
        { eventId: 'a', startMinutes: 540, endMinutes: 630 },
        { eventId: 'b', startMinutes: 570, endMinutes: 660 },
      ],
      dayMinutes: 1440,
    });

    const layoutById = new Map(
      layouts.map((layout) => [layout.eventId, layout]),
    );

    expect(layoutById.get('a')?.columnIndex).toBe(0);
    expect(layoutById.get('b')?.columnIndex).toBe(1);
    expect(layoutById.get('a')?.columnCount).toBe(2);
    expect(layoutById.get('b')?.columnCount).toBe(2);
  });

  it('reuses a freed lane within the same cluster', () => {
    const layouts = layoutCalendarEventOverlaps({
      intervals: [
        { eventId: 'a', startMinutes: 540, endMinutes: 600 },
        { eventId: 'b', startMinutes: 540, endMinutes: 660 },
        { eventId: 'c', startMinutes: 600, endMinutes: 660 },
      ],
      dayMinutes: 1440,
    });

    const layoutById = new Map(
      layouts.map((layout) => [layout.eventId, layout]),
    );

    expect(layoutById.get('a')?.columnIndex).toBe(0);
    expect(layoutById.get('b')?.columnIndex).toBe(1);
    expect(layoutById.get('c')?.columnIndex).toBe(0);
    expect(layoutById.get('a')?.columnCount).toBe(2);
  });

  it('starts a new cluster after a gap', () => {
    const layouts = layoutCalendarEventOverlaps({
      intervals: [
        { eventId: 'a', startMinutes: 540, endMinutes: 600 },
        { eventId: 'b', startMinutes: 570, endMinutes: 630 },
        { eventId: 'c', startMinutes: 700, endMinutes: 760 },
      ],
      dayMinutes: 1440,
    });

    const layoutById = new Map(
      layouts.map((layout) => [layout.eventId, layout]),
    );

    expect(layoutById.get('a')?.columnCount).toBe(2);
    expect(layoutById.get('c')?.columnCount).toBe(1);
  });

  it('computes vertical ratios from the day length', () => {
    const [layout] = layoutCalendarEventOverlaps({
      intervals: [{ eventId: 'a', startMinutes: 720, endMinutes: 1080 }],
      dayMinutes: 1440,
    });

    expect(layout.topRatio).toBeCloseTo(0.5);
    expect(layout.heightRatio).toBeCloseTo(0.25);
  });

  it('returns nothing for an empty day', () => {
    expect(
      layoutCalendarEventOverlaps({ intervals: [], dayMinutes: 1440 }),
    ).toEqual([]);
  });
});
