import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import {
  buildNotificationInboxRealtimeEvent,
  toNotificationRealtimeEntry,
} from 'src/engine/core-modules/notification/utils/notification-realtime-event.util';
import { buildInboxTopic } from 'src/engine/core-modules/notification/utils/inbox-topic.util';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';

// Fans freshly dispatched inbox notifications out on each recipient's own
// `workspace:<id>:inbox:<userId>` topic. The unread count is read back from the
// notification rows through NotificationService.countUnread — the same source
// the inbox list queries — so the badge is derived, never a parallel counter.
// Publishing is best-effort: the durable rows are the catch-up source and a
// fan-out failure must never fail the notification dispatch.
@Injectable()
export class NotificationRealtimePublisherService {
  constructor(
    private readonly realtimePublisherService: RealtimePublisherService,
    private readonly notificationService: NotificationService,
  ) {}

  async publishInboxNotifications({
    workspaceId,
    notifications,
  }: {
    workspaceId: string;
    notifications: NotificationEntity[];
  }): Promise<void> {
    const notificationsByUserId = groupNotificationsByUserId(notifications);

    for (const [userId, userNotifications] of notificationsByUserId) {
      const unreadCount = await this.notificationService.countUnread({
        workspaceId,
        userId,
      });

      await this.realtimePublisherService.publish(
        buildInboxTopic({ workspaceId, userId }),
        buildNotificationInboxRealtimeEvent({
          workspaceId,
          userId,
          unreadCount,
          notifications: userNotifications.map(toNotificationRealtimeEntry),
          occurredAt: new Date().toISOString(),
        }),
      );
    }
  }
}

// A dispatch batch can span several recipients (e.g. a mention fan-out), so the
// fan-out is per user: each inbox topic carries only that user's rows and the
// unread count scoped to them.
const groupNotificationsByUserId = (
  notifications: NotificationEntity[],
): Map<string, NotificationEntity[]> => {
  const notificationsByUserId = new Map<string, NotificationEntity[]>();

  for (const notification of notifications) {
    const existing = notificationsByUserId.get(notification.userId);

    if (isDefined(existing)) {
      existing.push(notification);
    } else {
      notificationsByUserId.set(notification.userId, [notification]);
    }
  }

  return notificationsByUserId;
};
