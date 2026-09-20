import { Temporal } from 'temporal-polyfill';

import { buildCalendarEventInstant } from '@/calendar/utils/buildCalendarEventInstant';
import { getCalendarEventSlotFromInstant } from '@/calendar/utils/getCalendarEventSlotFromInstant';

describe('buildCalendarEventInstant', () => {
  it('converts a wall-clock slot to the matching instant in the zone', () => {
    expect(
      buildCalendarEventInstant({
        slot: {
          day: Temporal.PlainDate.from('2026-07-15'),
          hour: 12,
          minute: 0,
        },
        timeZone: 'America/New_York',
      }),
    ).toBe('2026-07-15T16:00:00Z');
  });

  it('shifts a time inside the spring-forward gap forward', () => {
    // 02:30 does not exist on 2026-03-08 in New York; compatible shifts to 03:30.
    expect(
      buildCalendarEventInstant({
        slot: {
          day: Temporal.PlainDate.from('2026-03-08'),
          hour: 2,
          minute: 30,
        },
        timeZone: 'America/New_York',
      }),
    ).toBe('2026-03-08T07:30:00Z');
  });

  it('keeps the earlier offset for a fall-back overlap', () => {
    // 01:30 happens twice on 2026-11-01; compatible keeps the earlier (EDT) one.
    expect(
      buildCalendarEventInstant({
        slot: {
          day: Temporal.PlainDate.from('2026-11-01'),
          hour: 1,
          minute: 30,
        },
        timeZone: 'America/New_York',
      }),
    ).toBe('2026-11-01T05:30:00Z');
  });

  it('round-trips through getCalendarEventSlotFromInstant in the same zone', () => {
    const instant = buildCalendarEventInstant({
      slot: {
        day: Temporal.PlainDate.from('2026-07-15'),
        hour: 9,
        minute: 45,
      },
      timeZone: 'Europe/Paris',
    });

    const slot = getCalendarEventSlotFromInstant({
      instant,
      timeZone: 'Europe/Paris',
    });

    expect(slot?.day.toString()).toBe('2026-07-15');
    expect(slot?.hour).toBe(9);
    expect(slot?.minute).toBe(45);
  });

  it('places the same instant on a different day when the zone changes', () => {
    const instant = '2026-07-15T23:30:00Z';

    expect(
      getCalendarEventSlotFromInstant({
        instant,
        timeZone: 'UTC',
      })?.day.toString(),
    ).toBe('2026-07-15');
    expect(
      getCalendarEventSlotFromInstant({
        instant,
        timeZone: 'Asia/Tokyo',
      })?.day.toString(),
    ).toBe('2026-07-16');
  });

  it('returns null for an unparseable instant', () => {
    expect(
      getCalendarEventSlotFromInstant({
        instant: 'not-a-date',
        timeZone: 'UTC',
      }),
    ).toBeNull();
  });
});
