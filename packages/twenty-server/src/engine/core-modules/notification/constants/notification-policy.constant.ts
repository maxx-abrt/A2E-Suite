import { type NotificationChannel } from 'src/engine/core-modules/notification/constants/notification-channel.constant';

export const DEFAULT_NOTIFICATION_CHANNEL: NotificationChannel = 'INBOX';

export const MINUTES_PER_DAY = 24 * 60;

// A digest groups all email-channel notifications landing in the same window
// into one message: 15 minutes is short enough to stay near-real-time and long
// enough to collapse a burst (e.g. a comment thread) into one email.
export const NOTIFICATION_EMAIL_DIGEST_WINDOW_MS = 15 * 60 * 1000;

export const DEFAULT_NOTIFICATION_QUIET_HOURS: {
  enabled: boolean;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  utcOffsetMinutes: number;
} = {
  enabled: false,
  startMinuteOfDay: 22 * 60,
  endMinuteOfDay: 7 * 60,
  utcOffsetMinutes: 0,
};
