import { type NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { NotificationRealtimePublisherService } from 'src/engine/core-modules/notification/services/notification-realtime-publisher.service';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { NOTIFICATION_INBOX_UPDATED_EVENT_TYPE } from 'src/engine/core-modules/notification/utils/notification-realtime-event.util';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
const OTHER_USER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';

const buildNotification = (
  overrides: Partial<NotificationEntity> = {},
): NotificationEntity =>
  ({
    id: 'notification-1',
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    type: 'MENTION',
    payload: { snippet: 'hi' },
    createdAt: new Date('2026-09-18T10:00:00.000Z'),
    updatedAt: new Date('2026-09-18T10:00:00.000Z'),
    readAt: null,
    archivedAt: null,
    ...overrides,
  }) as NotificationEntity;

const buildService = ({
  unreadCountsByUserId = {},
}: {
  unreadCountsByUserId?: Record<string, number>;
} = {}) => {
  const publish = jest.fn().mockResolvedValue(undefined);
  const countUnread = jest.fn(
    async ({ userId }: { workspaceId: string; userId: string }) =>
      unreadCountsByUserId[userId] ?? 0,
  );

  const service = new NotificationRealtimePublisherService(
    { publish } as unknown as RealtimePublisherService,
    { countUnread } as unknown as NotificationService,
  );

  return { service, publish, countUnread };
};

describe('NotificationRealtimePublisherService', () => {
  it('publishes each new notification on the user-scoped inbox topic with the derived unread count', async () => {
    const { service, publish, countUnread } = buildService({
      unreadCountsByUserId: { [USER_ID]: 3 },
    });

    await service.publishInboxNotifications({
      workspaceId: WORKSPACE_ID,
      notifications: [buildNotification()],
    });

    expect(countUnread).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    expect(publish).toHaveBeenCalledWith(
      `workspace:${WORKSPACE_ID}:inbox:${USER_ID}`,
      expect.objectContaining({
        type: NOTIFICATION_INBOX_UPDATED_EVENT_TYPE,
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        unreadCount: 3,
        notifications: [
          expect.objectContaining({ id: 'notification-1', type: 'MENTION' }),
        ],
      }),
    );
  });

  it('aggregates a multi-recipient batch into one publish per user with their own unread count', async () => {
    const { service, publish, countUnread } = buildService({
      unreadCountsByUserId: { [USER_ID]: 1, [OTHER_USER_ID]: 5 },
    });

    await service.publishInboxNotifications({
      workspaceId: WORKSPACE_ID,
      notifications: [
        buildNotification(),
        buildNotification({
          id: 'notification-2',
          payload: { snippet: 'for other' },
          userId: OTHER_USER_ID,
        }),
      ],
    });

    expect(countUnread).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenCalledWith(
      `workspace:${WORKSPACE_ID}:inbox:${USER_ID}`,
      expect.objectContaining({
        unreadCount: 1,
        notifications: [expect.objectContaining({ id: 'notification-1' })],
      }),
    );
    expect(publish).toHaveBeenCalledWith(
      `workspace:${WORKSPACE_ID}:inbox:${OTHER_USER_ID}`,
      expect.objectContaining({
        unreadCount: 5,
        notifications: [
          expect.objectContaining({
            id: 'notification-2',
            payload: { snippet: 'for other' },
          }),
        ],
      }),
    );
  });

  it('publishes nothing when the dispatch produced no inbox rows', async () => {
    const { service, publish, countUnread } = buildService();

    await service.publishInboxNotifications({
      workspaceId: WORKSPACE_ID,
      notifications: [],
    });

    expect(publish).not.toHaveBeenCalled();
    expect(countUnread).not.toHaveBeenCalled();
  });
});
