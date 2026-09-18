import { Logger } from '@nestjs/common';

import { NotificationRequestedListener } from 'src/engine/core-modules/notification/listeners/notification-requested.listener';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { type NotificationRequest } from 'src/engine/core-modules/notification/types/notification-request.type';
import { type CustomWorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/custom-workspace-batch-event.type';

const buildBatch = (
  overrides: Partial<CustomWorkspaceEventBatch<NotificationRequest>> = {},
): CustomWorkspaceEventBatch<NotificationRequest> =>
  ({
    name: 'notification_requested',
    workspaceId: 'workspace-1',
    events: [{ userId: 'user-1', type: 'MENTION', payload: { snippet: 'hi' } }],
    ...overrides,
  }) as CustomWorkspaceEventBatch<NotificationRequest>;

describe('NotificationRequestedListener', () => {
  let listener: NotificationRequestedListener;
  let dispatchNotifications: jest.Mock;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    dispatchNotifications = jest.fn().mockResolvedValue({
      inboxNotifications: [],
      emailDigestBatches: [],
      suppressedByQuietHours: 0,
      skippedByPreference: 0,
    });

    listener = new NotificationRequestedListener({
      dispatchNotifications,
    } as unknown as NotificationService);
  });

  it('forwards a workspace batch to the notification service', async () => {
    await listener.handleNotificationRequested(buildBatch());

    expect(dispatchNotifications).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      requests: [
        { userId: 'user-1', type: 'MENTION', payload: { snippet: 'hi' } },
      ],
    });
  });

  it('skips a batch without a workspaceId', async () => {
    await listener.handleNotificationRequested(
      buildBatch({ workspaceId: undefined }),
    );

    expect(dispatchNotifications).not.toHaveBeenCalled();
  });

  it('swallows dispatch errors (notifications are best-effort)', async () => {
    dispatchNotifications.mockRejectedValue(new Error('db down'));

    await expect(
      listener.handleNotificationRequested(buildBatch()),
    ).resolves.toBeUndefined();
  });
});
