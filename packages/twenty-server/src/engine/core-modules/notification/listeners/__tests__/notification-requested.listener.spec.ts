import { Logger } from '@nestjs/common';

import { NotificationRequestedListener } from 'src/engine/core-modules/notification/listeners/notification-requested.listener';
import { type NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { NotificationEmailSenderService } from 'src/engine/core-modules/notification/services/notification-email-sender.service';
import { NotificationRealtimePublisherService } from 'src/engine/core-modules/notification/services/notification-realtime-publisher.service';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { type NotificationRequest } from 'src/engine/core-modules/notification/types/notification-request.type';
import { type NotificationEmailDigestBatch } from 'src/engine/core-modules/notification/utils/group-notifications-into-digest-batches.util';
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
  let publishInboxNotifications: jest.Mock;
  let sendEmailDigestBatches: jest.Mock;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    dispatchNotifications = jest.fn().mockResolvedValue({
      inboxNotifications: [],
      emailDigestBatches: [],
      suppressedByQuietHours: 0,
      skippedByPreference: 0,
    });
    publishInboxNotifications = jest.fn().mockResolvedValue(undefined);
    sendEmailDigestBatches = jest.fn().mockResolvedValue(0);

    listener = new NotificationRequestedListener(
      { dispatchNotifications } as unknown as NotificationService,
      {
        publishInboxNotifications,
      } as unknown as NotificationRealtimePublisherService,
      {
        sendEmailDigestBatches,
      } as unknown as NotificationEmailSenderService,
    );
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

  it('fans the dispatched inbox rows out on the recipients inbox topics', async () => {
    const inboxNotification = {
      id: 'notification-1',
      userId: 'user-1',
    } as NotificationEntity;
    dispatchNotifications.mockResolvedValue({
      inboxNotifications: [inboxNotification],
      emailDigestBatches: [],
      suppressedByQuietHours: 0,
      skippedByPreference: 0,
    });

    await listener.handleNotificationRequested(buildBatch());

    expect(publishInboxNotifications).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      notifications: [inboxNotification],
    });
  });

  it('hands the planned email digest batches to the email sender', async () => {
    const emailDigestBatch = {
      userId: 'user-1',
      windowStart: new Date('2026-09-18T10:00:00.000Z'),
      windowEnd: new Date('2026-09-18T10:15:00.000Z'),
      items: [],
    } as unknown as NotificationEmailDigestBatch;
    dispatchNotifications.mockResolvedValue({
      inboxNotifications: [],
      emailDigestBatches: [emailDigestBatch],
      suppressedByQuietHours: 0,
      skippedByPreference: 0,
    });

    await listener.handleNotificationRequested(buildBatch());

    expect(sendEmailDigestBatches).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      batches: [emailDigestBatch],
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
    expect(publishInboxNotifications).not.toHaveBeenCalled();
    expect(sendEmailDigestBatches).not.toHaveBeenCalled();
  });

  it('swallows fan-out errors so the durable rows stay the catch-up source', async () => {
    publishInboxNotifications.mockRejectedValue(new Error('redis down'));

    await expect(
      listener.handleNotificationRequested(buildBatch()),
    ).resolves.toBeUndefined();
  });

  it('swallows email errors so a mail outage never fails the domain flow', async () => {
    sendEmailDigestBatches.mockRejectedValue(new Error('smtp down'));

    await expect(
      listener.handleNotificationRequested(buildBatch()),
    ).resolves.toBeUndefined();
  });
});
