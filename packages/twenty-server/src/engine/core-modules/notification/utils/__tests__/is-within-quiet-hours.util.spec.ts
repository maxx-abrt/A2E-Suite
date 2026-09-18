import { type NotificationQuietHours } from 'src/engine/core-modules/notification/types/notification-preferences.type';
import { isWithinQuietHours } from 'src/engine/core-modules/notification/utils/is-within-quiet-hours.util';

const buildQuietHours = (
  overrides: Partial<NotificationQuietHours> = {},
): NotificationQuietHours => ({
  enabled: true,
  startMinuteOfDay: 22 * 60,
  endMinuteOfDay: 7 * 60,
  utcOffsetMinutes: 0,
  ...overrides,
});

const atUtc = (hours: number, minutes = 0): Date =>
  new Date(Date.UTC(2026, 8, 18, hours, minutes));

describe('isWithinQuietHours', () => {
  it('returns false when quiet hours are disabled', () => {
    expect(
      isWithinQuietHours({
        date: atUtc(23),
        quietHours: buildQuietHours({ enabled: false }),
      }),
    ).toBe(false);
  });

  it('returns false outside a wrapping window', () => {
    expect(
      isWithinQuietHours({ date: atUtc(12), quietHours: buildQuietHours() }),
    ).toBe(false);
  });

  it('returns true late at night in a wrapping window', () => {
    expect(
      isWithinQuietHours({
        date: atUtc(23, 30),
        quietHours: buildQuietHours(),
      }),
    ).toBe(true);
  });

  it('returns true early morning in a wrapping window', () => {
    expect(
      isWithinQuietHours({ date: atUtc(3), quietHours: buildQuietHours() }),
    ).toBe(true);
  });

  it('treats end as exclusive and start as inclusive', () => {
    const quietHours = buildQuietHours({
      startMinuteOfDay: 12 * 60,
      endMinuteOfDay: 14 * 60,
    });

    expect(isWithinQuietHours({ date: atUtc(12), quietHours })).toBe(true);
    expect(isWithinQuietHours({ date: atUtc(14), quietHours })).toBe(false);
  });

  it('applies the user utc offset to the clock', () => {
    // 03:00 UTC is 23:00 the previous local day for a UTC-4 user, inside 22-07.
    expect(
      isWithinQuietHours({
        date: atUtc(3),
        quietHours: buildQuietHours({ utcOffsetMinutes: -240 }),
      }),
    ).toBe(true);
  });

  it('treats an empty window as no window rather than all-day', () => {
    expect(
      isWithinQuietHours({
        date: atUtc(23),
        quietHours: buildQuietHours({
          startMinuteOfDay: 22 * 60,
          endMinuteOfDay: 22 * 60,
        }),
      }),
    ).toBe(false);
  });
});
