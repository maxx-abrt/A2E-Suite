import { type Repository } from 'typeorm';

import { KeyValuePairService } from 'src/engine/core-modules/key-value-pair/key-value-pair.service';
import { NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { type NotificationPreferences } from 'src/engine/core-modules/notification/types/notification-preferences.type';
import { type NotificationRequest } from 'src/engine/core-modules/notification/types/notification-request.type';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';

const buildPreferences = (
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences => ({
  channels: {},
  quietHours: {
    enabled: false,
    startMinuteOfDay: 22 * 60,
    endMinuteOfDay: 7 * 60,
    utcOffsetMinutes: 0,
  },
  ...overrides,
});

describe('NotificationService', () => {
  let notificationRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };
  let keyValuePairService: { get: jest.Mock; set: jest.Mock };
  let workspaceEventEmitter: { emitCustomBatchEvent: jest.Mock };
  let service: NotificationService;

  const setStoredPreferences = (preferences: NotificationPreferences) => {
    keyValuePairService.get.mockResolvedValue([{ value: preferences }]);
  };

  beforeEach(() => {
    notificationRepository = {
      create: jest.fn((input) => input),
      save: jest.fn(async (rows) => rows),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    keyValuePairService = {
      get: jest.fn().mockResolvedValue([]),
      set: jest.fn().mockResolvedValue(undefined),
    };
    workspaceEventEmitter = { emitCustomBatchEvent: jest.fn() };

    service = new NotificationService(
      notificationRepository as unknown as Repository<NotificationEntity>,
      keyValuePairService as unknown as KeyValuePairService<
        Record<string, NotificationPreferences>
      >,
      workspaceEventEmitter as unknown as WorkspaceEventEmitter,
    );
  });

  it('maps a default-channel request to a persisted inbox row', async () => {
    const result = await service.dispatchNotifications({
      workspaceId: 'workspace-1',
      requests: [
        { userId: 'user-1', type: 'MENTION', payload: { snippet: 'hi' } },
      ],
    });

    expect(notificationRepository.save).toHaveBeenCalledTimes(1);
    expect(notificationRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        type: 'MENTION',
        payload: { snippet: 'hi' },
      }),
    ]);
    expect(result.inboxNotifications).toHaveLength(1);
    expect(result.emailDigestBatches).toEqual([]);
    expect(result.skippedByPreference).toBe(0);
  });

  it('skips a type the user opted out of with NONE', async () => {
    setStoredPreferences(buildPreferences({ channels: { MENTION: 'NONE' } }));

    const result = await service.dispatchNotifications({
      workspaceId: 'workspace-1',
      requests: [{ userId: 'user-1', type: 'MENTION', payload: {} }],
    });

    expect(notificationRepository.save).not.toHaveBeenCalled();
    expect(result.inboxNotifications).toEqual([]);
    expect(result.skippedByPreference).toBe(1);
  });

  it('routes an EMAIL-preference type to a digest batch, not the inbox', async () => {
    setStoredPreferences(
      buildPreferences({ channels: { BUDGET_ALERT: 'EMAIL' } }),
    );

    const result = await service.dispatchNotifications({
      workspaceId: 'workspace-1',
      requests: [
        {
          userId: 'user-1',
          type: 'BUDGET_ALERT',
          payload: { budgetId: 'budget-1' },
          createdAt: new Date('2026-09-18T10:01:00.000Z'),
        },
      ],
    });

    expect(notificationRepository.save).not.toHaveBeenCalled();
    expect(result.emailDigestBatches).toHaveLength(1);
    expect(result.emailDigestBatches[0].items[0]).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        type: 'BUDGET_ALERT',
        payload: { budgetId: 'budget-1' },
      }),
    );
  });

  it('suppresses EMAIL candidates inside quiet hours', async () => {
    setStoredPreferences(
      buildPreferences({
        channels: { BUDGET_ALERT: 'EMAIL' },
        quietHours: {
          enabled: true,
          startMinuteOfDay: 22 * 60,
          endMinuteOfDay: 7 * 60,
          utcOffsetMinutes: 0,
        },
      }),
    );

    const result = await service.dispatchNotifications({
      workspaceId: 'workspace-1',
      requests: [
        {
          userId: 'user-1',
          type: 'BUDGET_ALERT',
          payload: {},
          createdAt: new Date('2026-09-18T23:30:00.000Z'),
        },
      ],
    });

    expect(result.suppressedByQuietHours).toBe(1);
    expect(result.emailDigestBatches).toEqual([]);
  });

  it('batches EMAIL candidates by aligned digest window', async () => {
    setStoredPreferences(
      buildPreferences({ channels: { BUDGET_ALERT: 'EMAIL' } }),
    );

    const result = await service.dispatchNotifications({
      workspaceId: 'workspace-1',
      requests: [
        {
          userId: 'user-1',
          type: 'BUDGET_ALERT',
          payload: { budgetId: 'a' },
          createdAt: new Date('2026-09-18T10:01:00.000Z'),
        },
        {
          userId: 'user-1',
          type: 'BUDGET_ALERT',
          payload: { budgetId: 'b' },
          createdAt: new Date('2026-09-18T10:14:00.000Z'),
        },
        {
          userId: 'user-1',
          type: 'BUDGET_ALERT',
          payload: { budgetId: 'c' },
          createdAt: new Date('2026-09-18T10:31:00.000Z'),
        },
      ],
    });

    expect(result.emailDigestBatches).toHaveLength(2);
    expect(result.emailDigestBatches[0].items).toHaveLength(2);
    expect(result.emailDigestBatches[1].items).toHaveLength(1);
  });

  it('resolves each type against its own per-type channel preference', async () => {
    setStoredPreferences(
      buildPreferences({
        channels: { MENTION: 'NONE', BUDGET_ALERT: 'EMAIL' },
      }),
    );

    const requests: NotificationRequest[] = [
      { userId: 'user-1', type: 'MENTION', payload: {} },
      { userId: 'user-1', type: 'BUDGET_ALERT', payload: {} },
      { userId: 'user-1', type: 'CHAT_MESSAGE', payload: {} },
    ];

    const result = await service.dispatchNotifications({
      workspaceId: 'workspace-1',
      requests,
    });

    expect(result.skippedByPreference).toBe(1);
    expect(result.emailDigestBatches).toHaveLength(1);
    expect(result.inboxNotifications).toHaveLength(1);
    expect(result.inboxNotifications[0].type).toBe('CHAT_MESSAGE');
  });

  it('emits one custom batch event from the producer seam', () => {
    service.requestNotifications({
      workspaceId: 'workspace-1',
      requests: [{ userId: 'user-1', type: 'MENTION', payload: {} }],
    });

    expect(workspaceEventEmitter.emitCustomBatchEvent).toHaveBeenCalledWith(
      'notification_requested',
      [expect.objectContaining({ userId: 'user-1', type: 'MENTION' })],
      'workspace-1',
    );
  });

  it('persists a normalized per-user preference model', async () => {
    const normalized = await service.updatePreferences({
      userId: 'user-1',
      preferences: { channels: { MENTION: 'EMAIL' } },
    });

    expect(normalized.channels.MENTION).toBe('EMAIL');
    expect(keyValuePairService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        workspaceId: null,
        key: 'notification-preferences',
        value: expect.objectContaining({
          channels: { MENTION: 'EMAIL' },
        }),
      }),
    );
  });

  it('normalizes stored preferences and drops unknown entries', async () => {
    keyValuePairService.get.mockResolvedValue([
      {
        value: {
          channels: { MENTION: 'EMAIL', NOT_A_TYPE: 'NONE' },
          quietHours: {
            enabled: true,
            startMinuteOfDay: 99999,
            endMinuteOfDay: 60,
            utcOffsetMinutes: 0,
          },
        },
      },
    ]);

    const preferences = await service.getPreferences('user-1');

    expect(preferences.channels).toEqual({ MENTION: 'EMAIL' });
    expect(preferences.quietHours.startMinuteOfDay).toBe(22 * 60);
    expect(preferences.quietHours.endMinuteOfDay).toBe(60);
  });

  it('bulk-archives the caller own unarchived rows in one update', async () => {
    notificationRepository.update.mockResolvedValue({ affected: 2 });

    const archived = await service.archiveNotifications({
      workspaceId: 'workspace-1',
      userId: 'user-1',
      notificationIds: ['notification-1', 'notification-2'],
    });

    expect(archived).toBe(2);
    expect(notificationRepository.update).toHaveBeenCalledWith(
      {
        id: expect.anything(),
        workspaceId: 'workspace-1',
        userId: 'user-1',
        archivedAt: expect.anything(),
      },
      { archivedAt: expect.any(Date) },
    );
  });

  it('skips the archive update for an empty selection', async () => {
    const archived = await service.archiveNotifications({
      workspaceId: 'workspace-1',
      userId: 'user-1',
      notificationIds: [],
    });

    expect(archived).toBe(0);
    expect(notificationRepository.update).not.toHaveBeenCalled();
  });
});
