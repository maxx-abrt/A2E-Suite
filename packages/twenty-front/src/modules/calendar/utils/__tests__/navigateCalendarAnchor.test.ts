import { Temporal } from 'temporal-polyfill';

import { navigateCalendarAnchor } from '@/calendar/utils/navigateCalendarAnchor';

describe('navigateCalendarAnchor', () => {
  it.each([
    ['day', '2026-07-15', 'next', '2026-07-16'],
    ['day', '2026-07-15', 'previous', '2026-07-14'],
    ['week', '2026-07-15', 'next', '2026-07-22'],
    ['week', '2026-07-15', 'previous', '2026-07-08'],
    ['month', '2026-07-15', 'next', '2026-08-15'],
    ['month', '2026-01-31', 'next', '2026-02-28'],
    ['agenda', '2026-07-15', 'previous', '2026-06-15'],
  ] as const)(
    '%s from %s going %s lands on %s',
    (mode, anchor, direction, expected) => {
      expect(
        navigateCalendarAnchor({
          mode,
          anchorDate: Temporal.PlainDate.from(anchor),
          direction,
        }).toString(),
      ).toBe(expected);
    },
  );
});
