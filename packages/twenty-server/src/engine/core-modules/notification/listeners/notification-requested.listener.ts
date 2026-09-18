import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { OnCustomBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-custom-batch-event.decorator';
import { NOTIFICATION_REQUESTED } from 'src/engine/core-modules/notification/constants/notification-event-name.constant';
import { NotificationRealtimePublisherService } from 'src/engine/core-modules/notification/services/notification-realtime-publisher.service';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { type NotificationRequest } from 'src/engine/core-modules/notification/types/notification-request.type';
import { CustomWorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/custom-workspace-batch-event.type';

@Injectable()
export class NotificationRequestedListener {
  private readonly logger = new Logger(NotificationRequestedListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRealtimePublisherService: NotificationRealtimePublisherService,
  ) {}

  @OnCustomBatchEvent(NOTIFICATION_REQUESTED)
  async handleNotificationRequested(
    payload: CustomWorkspaceEventBatch<NotificationRequest>,
  ): Promise<void> {
    if (!isDefined(payload.workspaceId)) {
      return;
    }

    try {
      const { inboxNotifications } =
        await this.notificationService.dispatchNotifications({
          workspaceId: payload.workspaceId,
          requests: payload.events,
        });

      await this.notificationRealtimePublisherService.publishInboxNotifications(
        {
          workspaceId: payload.workspaceId,
          notifications: inboxNotifications,
        },
      );
    } catch (error) {
      // Notifications are best-effort: a failed dispatch or fan-out must never
      // fail the domain flow that produced the event.
      this.logger.error('Failed to dispatch notification requests', error);
    }
  }
}
