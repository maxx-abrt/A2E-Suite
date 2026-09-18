import { type NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { NotificationResolver } from 'src/engine/core-modules/notification/notification.resolver';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';

const buildNotification = (
  overrides: Partial<NotificationEntity> = {},
): NotificationEntity =>
  ({
    id: 'notification-1',
    workspaceId: 'workspace-1',
    userId: 'user-1',
    type: 'MENTION',
    payload: { channelId: 'channel-1' },
    readAt: null,
    archivedAt: null,
    createdAt: new Date('2026-09-18T09:00:00.000Z'),
    updatedAt: new Date('2026-09-18T09:00:00.000Z'),
    ...overrides,
  }) as unknown as NotificationEntity;

const buildResolver = () => {
  const notificationService = {
    findForUser: jest.fn().mockResolvedValue([]),
    countUnread: jest.fn().mockResolvedValue(0),
    markAsRead: jest.fn().mockResolvedValue(0),
    archiveNotifications: jest.fn().mockResolvedValue(0),
  };
  const resolver = new NotificationResolver(
    notificationService as unknown as NotificationService,
  );

  return { resolver, notificationService };
};

const currentUser = { id: 'user-1' } as AuthContextUser;
const currentWorkspace = { id: 'workspace-1' } as WorkspaceEntity;

describe('NotificationResolver', () => {
  it('reads only the caller inbox and projects the entity to a DTO', async () => {
    const { resolver, notificationService } = buildResolver();

    notificationService.findForUser.mockResolvedValue([buildNotification()]);

    const notifications = await resolver.notifications(
      currentUser,
      currentWorkspace,
      false,
    );

    expect(notificationService.findForUser).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      userId: 'user-1',
      includeArchived: false,
    });
    expect(notifications).toEqual([
      {
        id: 'notification-1',
        type: 'MENTION',
        payload: { channelId: 'channel-1' },
        createdAt: new Date('2026-09-18T09:00:00.000Z'),
        readAt: null,
        archivedAt: null,
      },
    ]);
  });

  it('passes the archived opt-in through to the service', async () => {
    const { resolver, notificationService } = buildResolver();

    await resolver.notifications(currentUser, currentWorkspace, true);

    expect(notificationService.findForUser).toHaveBeenCalledWith(
      expect.objectContaining({ includeArchived: true }),
    );
  });

  it('counts unread notifications for the caller', async () => {
    const { resolver, notificationService } = buildResolver();

    notificationService.countUnread.mockResolvedValue(3);

    await expect(
      resolver.notificationUnreadCount(currentUser, currentWorkspace),
    ).resolves.toBe(3);
    expect(notificationService.countUnread).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      userId: 'user-1',
    });
  });

  it('marks a selection as read in one bulk call', async () => {
    const { resolver, notificationService } = buildResolver();

    notificationService.markAsRead.mockResolvedValue(2);

    await expect(
      resolver.markNotificationsAsRead(
        ['notification-1', 'notification-2'],
        currentUser,
        currentWorkspace,
      ),
    ).resolves.toBe(2);
    expect(notificationService.markAsRead).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      userId: 'user-1',
      notificationIds: ['notification-1', 'notification-2'],
    });
  });

  it('archives a selection in one bulk call', async () => {
    const { resolver, notificationService } = buildResolver();

    notificationService.archiveNotifications.mockResolvedValue(2);

    await expect(
      resolver.archiveNotifications(
        ['notification-1', 'notification-2'],
        currentUser,
        currentWorkspace,
      ),
    ).resolves.toBe(2);
    expect(notificationService.archiveNotifications).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      userId: 'user-1',
      notificationIds: ['notification-1', 'notification-2'],
    });
  });
});
