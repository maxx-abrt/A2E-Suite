import { Temporal } from 'temporal-polyfill';

import { getCalendarViewRange } from '@/calendar/utils/getCalendarViewRange';

describe('getCalendarViewRange', () => {
  it.each([
    ['day', '2026-07-15', '2026-07-15', '2026-07-15'],
    ['week', '2026-07-15', '2026-07-13', '2026-07-19'],
    ['month', '2026-07-15', '2026-06-29', '2026-08-02'],
    ['agenda', '2026-07-15', '2026-06-29', '2026-08-02'],
  ] as const)(
    '%s around %s covers %s through %s',
    (mode, anchor, firstDay, lastDay) => {
      const range = getCalendarViewRange({
        mode,
        anchorDate: Temporal.PlainDate.from(anchor),
        weekStartsOnDayIndex: 1,
      });

      expect(range.firstDay.toString()).toBe(firstDay);
      expect(range.lastDay.toString()).toBe(lastDay);
    },
  );

  it('honors the configured week start day', () => {
    const range = getCalendarViewRange({
      mode: 'week',
      anchorDate: Temporal.PlainDate.from('2026-07-15'),
      weekStartsOnDayIndex: 0,
    });

    expect(range.firstDay.toString()).toBe('2026-07-12');
    expect(range.lastDay.toString()).toBe('2026-07-18');
  });

  it('falls back to Monday for an invalid week start day', () => {
    const range = getCalendarViewRange({
      mode: 'week',
      anchorDate: Temporal.PlainDate.from('2026-07-15'),
      weekStartsOnDayIndex: 42,
    });

    expect(range.firstDay.toString()).toBe('2026-07-13');
  });
});
