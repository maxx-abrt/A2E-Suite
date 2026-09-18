import { type NotificationPreferences } from 'src/engine/core-modules/notification/types/notification-preferences.type';
import { resolveNotificationChannel } from 'src/engine/core-modules/notification/utils/resolve-notification-channel.util';

const buildPreferences = (
  channels: NotificationPreferences['channels'],
): NotificationPreferences => ({
  channels,
  quietHours: {
    enabled: false,
    startMinuteOfDay: 22 * 60,
    endMinuteOfDay: 7 * 60,
    utcOffsetMinutes: 0,
  },
});

describe('resolveNotificationChannel', () => {
  it('falls back to INBOX for a type the user never configured', () => {
    expect(
      resolveNotificationChannel({
        preferences: buildPreferences({}),
        type: 'MENTION',
      }),
    ).toBe('INBOX');
  });

  it('honors a per-type override', () => {
    expect(
      resolveNotificationChannel({
        preferences: buildPreferences({ BUDGET_ALERT: 'EMAIL' }),
        type: 'BUDGET_ALERT',
      }),
    ).toBe('EMAIL');
  });

  it('honors an explicit NONE opt-out', () => {
    expect(
      resolveNotificationChannel({
        preferences: buildPreferences({ WATCHED_RECORD_CHANGED: 'NONE' }),
        type: 'WATCHED_RECORD_CHANGED',
      }),
    ).toBe('NONE');
  });

  it('does not leak an override into another type', () => {
    const preferences = buildPreferences({ MENTION: 'NONE' });

    expect(resolveNotificationChannel({ preferences, type: 'MENTION' })).toBe(
      'NONE',
    );
    expect(
      resolveNotificationChannel({ preferences, type: 'CHAT_MESSAGE' }),
    ).toBe('INBOX');
  });
});
