import { type Repository } from 'typeorm';

import { NotificationWatchEntity } from 'src/engine/core-modules/notification/notification-watch.entity';
import { NotificationWatchService } from 'src/engine/core-modules/notification/services/notification-watch.service';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { RealtimeTopicAccessService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-access.service';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

const buildWatchRow = (
  overrides: Partial<NotificationWatchEntity> = {},
): NotificationWatchEntity =>
  ({
    id: 'watch-1',
    workspaceId: 'workspace-1',
    userId: 'user-1',
    targetKind: 'RECORD',
    targetId: 'record-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }) as NotificationWatchEntity;

describe('NotificationWatchService', () => {
  let notificationWatchRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  let notificationService: { requestNotifications: jest.Mock };
  let realtimeTopicAccessService: {
    canWorkspaceMemberReadChatChannel: jest.Mock;
    canWorkspaceMemberReadObjectRecord: jest.Mock;
  };
  let userWorkspaceService: { getUserWorkspaceForUser: jest.Mock };
  let workspaceCacheService: { getOrRecompute: jest.Mock };
  let service: NotificationWatchService;

  beforeEach(() => {
    notificationWatchRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (row) => row),
      create: jest.fn((input) => input),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    notificationService = { requestNotifications: jest.fn() };
    realtimeTopicAccessService = {
      canWorkspaceMemberReadChatChannel: jest.fn().mockResolvedValue(true),
      canWorkspaceMemberReadObjectRecord: jest.fn().mockResolvedValue(true),
    };
    userWorkspaceService = {
      getUserWorkspaceForUser: jest
        .fn()
        .mockResolvedValue({ id: 'user-workspace-1' }),
    };
    workspaceCacheService = {
      getOrRecompute: jest.fn().mockResolvedValue({
        flatWorkspaceMemberMaps: {
          byId: {},
          idByUserId: { 'user-1': 'workspace-member-1' },
        },
      }),
    };

    service = new NotificationWatchService(
      notificationWatchRepository as unknown as Repository<NotificationWatchEntity>,
      notificationService as unknown as NotificationService,
      realtimeTopicAccessService as unknown as RealtimeTopicAccessService,
      userWorkspaceService as unknown as UserWorkspaceService,
      workspaceCacheService as unknown as WorkspaceCacheService,
    );
  });

  describe('watch/unwatch lifecycle', () => {
    it('creates a watch row when none exists', async () => {
      const watch = await service.watch({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        targetKind: 'RECORD',
        targetId: 'record-1',
      });

      expect(notificationWatchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'workspace-1',
          userId: 'user-1',
          targetKind: 'RECORD',
          targetId: 'record-1',
        }),
      );
      expect(watch.targetId).toBe('record-1');
    });

    it('is idempotent: watching twice returns the existing row without a second insert', async () => {
      notificationWatchRepository.findOne.mockResolvedValue(buildWatchRow());

      await service.watch({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        targetKind: 'RECORD',
        targetId: 'record-1',
      });

      expect(notificationWatchRepository.save).not.toHaveBeenCalled();
    });

    it('unwatch deletes by target and reports whether a row was removed', async () => {
      const removed = await service.unwatch({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        targetKind: 'CHANNEL',
        targetId: 'channel-1',
      });

      expect(notificationWatchRepository.delete).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        targetKind: 'CHANNEL',
        targetId: 'channel-1',
      });
      expect(removed).toBe(true);
    });

    it('unwatch returns false when nothing matched', async () => {
      notificationWatchRepository.delete.mockResolvedValue({ affected: 0 });

      const removed = await service.unwatch({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        targetKind: 'RECORD',
        targetId: 'record-1',
      });

      expect(removed).toBe(false);
    });

    it('isWatching reflects the presence of the row', async () => {
      expect(
        await service.isWatching({
          workspaceId: 'workspace-1',
          userId: 'user-1',
          targetKind: 'RECORD',
          targetId: 'record-1',
        }),
      ).toBe(false);

      notificationWatchRepository.findOne.mockResolvedValue(buildWatchRow());

      expect(
        await service.isWatching({
          workspaceId: 'workspace-1',
          userId: 'user-1',
          targetKind: 'RECORD',
          targetId: 'record-1',
        }),
      ).toBe(true);
    });
  });

  describe('change-event → notification mapping', () => {
    it('emits one WATCHED_RECORD_CHANGED request per permitted watcher', async () => {
      workspaceCacheService.getOrRecompute.mockResolvedValue({
        flatWorkspaceMemberMaps: {
          byId: {},
          idByUserId: {
            'user-1': 'workspace-member-1',
            'user-2': 'workspace-member-2',
          },
        },
      });
      notificationWatchRepository.find.mockResolvedValue([
        buildWatchRow({ id: 'watch-1', userId: 'user-1' }),
        buildWatchRow({ id: 'watch-2', userId: 'user-2' }),
      ]);

      const notifiedUserIds = await service.notifyWatchersOfChange({
        workspaceId: 'workspace-1',
        targetKind: 'RECORD',
        targetId: 'record-1',
        objectNameSingular: 'opportunity',
        changedFieldNames: ['amount'],
      });

      expect(notifiedUserIds).toEqual(['user-1', 'user-2']);
      expect(notificationService.requestNotifications).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        requests: [
          {
            userId: 'user-1',
            type: 'WATCHED_RECORD_CHANGED',
            payload: {
              kind: 'record.change',
              targetKind: 'RECORD',
              changedFieldNames: ['amount'],
              objectNameSingular: 'opportunity',
              recordId: 'record-1',
            },
          },
          {
            userId: 'user-2',
            type: 'WATCHED_RECORD_CHANGED',
            payload: {
              kind: 'record.change',
              targetKind: 'RECORD',
              changedFieldNames: ['amount'],
              objectNameSingular: 'opportunity',
              recordId: 'record-1',
            },
          },
        ],
      });
    });

    it('builds a channel payload carrying channelId', async () => {
      notificationWatchRepository.find.mockResolvedValue([buildWatchRow()]);

      await service.notifyWatchersOfChange({
        workspaceId: 'workspace-1',
        targetKind: 'CHANNEL',
        targetId: 'channel-1',
      });

      expect(notificationService.requestNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          requests: [
            expect.objectContaining({
              type: 'WATCHED_RECORD_CHANGED',
              payload: expect.objectContaining({
                kind: 'record.change',
                targetKind: 'CHANNEL',
                channelId: 'channel-1',
              }),
            }),
          ],
        }),
      );
    });

    it('short-circuits when nobody watches the target', async () => {
      notificationWatchRepository.find.mockResolvedValue([]);

      const notifiedUserIds = await service.notifyWatchersOfChange({
        workspaceId: 'workspace-1',
        targetKind: 'RECORD',
        targetId: 'record-1',
        objectNameSingular: 'task',
      });

      expect(notifiedUserIds).toEqual([]);
      expect(notificationService.requestNotifications).not.toHaveBeenCalled();
    });

    it('excludes the users a producer asks to skip', async () => {
      notificationWatchRepository.find.mockResolvedValue([
        buildWatchRow({ id: 'watch-1', userId: 'user-1' }),
        buildWatchRow({ id: 'watch-2', userId: 'user-2' }),
      ]);

      const notifiedUserIds = await service.notifyWatchersOfChange({
        workspaceId: 'workspace-1',
        targetKind: 'RECORD',
        targetId: 'record-1',
        objectNameSingular: 'task',
        excludeUserIds: ['user-2'],
      });

      expect(notifiedUserIds).toEqual(['user-1']);
      expect(notificationService.requestNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          requests: [expect.objectContaining({ userId: 'user-1' })],
        }),
      );
    });
  });

  describe('permission-loss cleanup', () => {
    it('drops a watch whose user lost record access and does not notify them', async () => {
      notificationWatchRepository.find.mockResolvedValue([
        buildWatchRow({ id: 'watch-1', userId: 'user-1' }),
      ]);
      realtimeTopicAccessService.canWorkspaceMemberReadObjectRecord.mockResolvedValue(
        false,
      );

      const notifiedUserIds = await service.notifyWatchersOfChange({
        workspaceId: 'workspace-1',
        targetKind: 'RECORD',
        targetId: 'record-1',
        objectNameSingular: 'opportunity',
      });

      expect(notificationWatchRepository.delete).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        id: 'watch-1',
      });
      expect(notifiedUserIds).toEqual([]);
      expect(notificationService.requestNotifications).not.toHaveBeenCalled();
    });

    it('drops the watch of a removed member (no user workspace resolves)', async () => {
      notificationWatchRepository.find.mockResolvedValue([
        buildWatchRow({ id: 'watch-1', userId: 'user-1' }),
      ]);
      userWorkspaceService.getUserWorkspaceForUser.mockResolvedValue(null);

      const notifiedUserIds = await service.notifyWatchersOfChange({
        workspaceId: 'workspace-1',
        targetKind: 'CHANNEL',
        targetId: 'channel-1',
      });

      expect(notificationWatchRepository.delete).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        id: 'watch-1',
      });
      expect(notifiedUserIds).toEqual([]);
    });

    it('removeWatchesForUser drops every watch for the workspace user', async () => {
      notificationWatchRepository.delete.mockResolvedValue({ affected: 3 });

      const removed = await service.removeWatchesForUser({
        workspaceId: 'workspace-1',
        userId: 'user-1',
      });

      expect(notificationWatchRepository.delete).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        userId: 'user-1',
      });
      expect(removed).toBe(3);
    });
  });
});
