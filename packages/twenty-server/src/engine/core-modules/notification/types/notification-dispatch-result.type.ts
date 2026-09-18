import { type NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { type NotificationEmailDigestBatch } from 'src/engine/core-modules/notification/utils/group-notifications-into-digest-batches.util';

export type NotificationDispatchResult = {
  inboxNotifications: NotificationEntity[];
  emailDigestBatches: NotificationEmailDigestBatch[];
  // Email-channel notifications withheld by the quiet-hours window. They are
  // not lost: the caller (digest worker) re-dispatches them after quiet hours.
  suppressedByQuietHours: number;
  skippedByPreference: number;
};
