import { isDefined } from 'twenty-shared/utils';

import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from 'src/engine/core-modules/notification/constants/notification-channel.constant';
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from 'src/engine/core-modules/notification/constants/notification-type.constant';
import {
  DEFAULT_NOTIFICATION_QUIET_HOURS,
  MINUTES_PER_DAY,
} from 'src/engine/core-modules/notification/constants/notification-policy.constant';
import {
  type NotificationChannelPreferences,
  type NotificationPreferences,
  type NotificationQuietHours,
} from 'src/engine/core-modules/notification/types/notification-preferences.type';

// Preferences are persisted as free JSON, so every read normalizes: unknown
// types/channels and out-of-range minutes are dropped rather than trusted, and
// the caller always gets a complete model to resolve channels against.
export const normalizeNotificationPreferences = (
  storedPreferences?: Partial<NotificationPreferences> | null,
): NotificationPreferences => {
  const storedChannels = storedPreferences?.channels;
  const channels: NotificationChannelPreferences = {};

  if (isDefined(storedChannels) && typeof storedChannels === 'object') {
    for (const [type, channel] of Object.entries(storedChannels)) {
      if (
        NOTIFICATION_TYPES.includes(type as NotificationType) &&
        NOTIFICATION_CHANNELS.includes(channel as NotificationChannel)
      ) {
        channels[type as NotificationType] = channel as NotificationChannel;
      }
    }
  }

  return {
    channels,
    quietHours: normalizeQuietHours(storedPreferences?.quietHours),
  };
};

const normalizeQuietHours = (
  storedQuietHours?: Partial<NotificationQuietHours> | null,
): NotificationQuietHours => ({
  enabled: storedQuietHours?.enabled === true,
  startMinuteOfDay: normalizeMinuteOfDay(
    storedQuietHours?.startMinuteOfDay,
    DEFAULT_NOTIFICATION_QUIET_HOURS.startMinuteOfDay,
  ),
  endMinuteOfDay: normalizeMinuteOfDay(
    storedQuietHours?.endMinuteOfDay,
    DEFAULT_NOTIFICATION_QUIET_HOURS.endMinuteOfDay,
  ),
  utcOffsetMinutes: normalizeUtcOffsetMinutes(
    storedQuietHours?.utcOffsetMinutes,
    DEFAULT_NOTIFICATION_QUIET_HOURS.utcOffsetMinutes,
  ),
});

const normalizeMinuteOfDay = (value: unknown, fallback: number): number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value < MINUTES_PER_DAY
    ? value
    : fallback;

const normalizeUtcOffsetMinutes = (value: unknown, fallback: number): number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= -720 &&
  value <= 840
    ? value
    : fallback;
