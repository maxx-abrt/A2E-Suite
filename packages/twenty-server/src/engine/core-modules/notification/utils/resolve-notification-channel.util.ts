import { type NotificationChannel } from 'src/engine/core-modules/notification/constants/notification-channel.constant';
import { DEFAULT_NOTIFICATION_CHANNEL } from 'src/engine/core-modules/notification/constants/notification-policy.constant';
import { type NotificationType } from 'src/engine/core-modules/notification/constants/notification-type.constant';
import { type NotificationPreferences } from 'src/engine/core-modules/notification/types/notification-preferences.type';

// A user only stores overrides; every type they never configured falls back to
// the inbox default, so adding a new notification type needs no data backfill.
export const resolveNotificationChannel = ({
  preferences,
  type,
}: {
  preferences: NotificationPreferences;
  type: NotificationType;
}): NotificationChannel =>
  preferences.channels[type] ?? DEFAULT_NOTIFICATION_CHANNEL;
