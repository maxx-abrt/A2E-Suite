import { type NotificationDTO } from 'src/engine/core-modules/notification/dtos/notification.dto';
import { type NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';

// The entity is a TypeORM row with a workspace relation; the resolver exposes
// only the per-user lifecycle fields, so the projection is explicit rather than
// returning the entity and leaking `workspaceId`/`workspace`.
export const toNotificationDTO = (
  notification: NotificationEntity,
): NotificationDTO => ({
  id: notification.id,
  type: notification.type,
  payload: notification.payload,
  createdAt: notification.createdAt,
  readAt: notification.readAt,
  archivedAt: notification.archivedAt,
});
