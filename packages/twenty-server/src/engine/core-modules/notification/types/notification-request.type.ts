import { type NotificationType } from 'src/engine/core-modules/notification/constants/notification-type.constant';

export type NotificationRequest = {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  // Producers may pass the domain moment (e.g. the message timestamp) so a
  // replay lands in the same digest window instead of the batch flush time.
  createdAt?: Date;
};
