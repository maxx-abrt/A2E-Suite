import { type NotificationChannel } from 'src/engine/core-modules/notification/constants/notification-channel.constant';
import { type NotificationType } from 'src/engine/core-modules/notification/constants/notification-type.constant';

export type NotificationChannelPreferences = Partial<
  Record<NotificationType, NotificationChannel>
>;

// Quiet hours are an absolute local-time window; utcOffsetMinutes carries the
// user's timezone so the policy stays pure and testable without a tz database.
export type NotificationQuietHours = {
  enabled: boolean;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  utcOffsetMinutes: number;
};

export type NotificationPreferences = {
  channels: NotificationChannelPreferences;
  quietHours: NotificationQuietHours;
};
