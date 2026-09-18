import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';

import { NotificationWatchListener } from 'src/engine/core-modules/notification/listeners/notification-watch.listener';
import { NotificationWatchService } from 'src/engine/core-modules/notification/services/notification-watch.service';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const RECORD_ID = 'c31a0100-0000-4000-8000-000000000000';

type WatchedRecord = { id: string };

const buildListener = () => {
  const notifyWatchersOfChange = jest.fn().mockResolvedValue([]);
  const notificationWatchService = {
    notifyWatchersOfChange,
  } as unknown as NotificationWatchService;
  const listener = new NotificationWatchListener(notificationWatchService);

  return { listener, notifyWatchersOfChange };
};

describe('NotificationWatchListener', () => {
  it('maps a document create to the DOCUMENT target kind', async () => {
    const { listener, notifyWatchersOfChange } = buildListener();

    await listener.handleDocumentCreated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: { after: { id: RECORD_ID } },
        } as unknown as ObjectRecordCreateEvent<WatchedRecord>,
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordCreateEvent<WatchedRecord>
    >);

    expect(notifyWatchersOfChange).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      targetKind: 'DOCUMENT',
      targetId: RECORD_ID,
      objectNameSingular: 'document',
    });
  });

  it('maps an opportunity update to the RECORD kind with the changed fields', async () => {
    const { listener, notifyWatchersOfChange } = buildListener();

    await listener.handleOpportunityUpdated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: {
            after: { id: RECORD_ID },
            updatedFields: ['amount', 'stage'],
          },
        } as unknown as ObjectRecordUpdateEvent<WatchedRecord>,
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordUpdateEvent<WatchedRecord>
    >);

    expect(notifyWatchersOfChange).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      targetKind: 'RECORD',
      targetId: RECORD_ID,
      objectNameSingular: 'opportunity',
      changedFieldNames: ['amount', 'stage'],
    });
  });

  it('maps a chat message create to a CHANNEL watch on the channel id', async () => {
    const { listener, notifyWatchersOfChange } = buildListener();

    await listener.handleChatMessageCreated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: { after: { id: RECORD_ID, channelId: 'channel-1' } },
        } as unknown as ObjectRecordCreateEvent<
          WatchedRecord & { channelId?: string | null }
        >,
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordCreateEvent<WatchedRecord & { channelId?: string | null }>
    >);

    expect(notifyWatchersOfChange).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      targetKind: 'CHANNEL',
      targetId: 'channel-1',
    });
  });

  it('skips a chat message without a channel id', async () => {
    const { listener, notifyWatchersOfChange } = buildListener();

    await listener.handleChatMessageCreated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: { after: { id: RECORD_ID } },
        } as unknown as ObjectRecordCreateEvent<
          WatchedRecord & { channelId?: string | null }
        >,
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordCreateEvent<WatchedRecord & { channelId?: string | null }>
    >);

    expect(notifyWatchersOfChange).not.toHaveBeenCalled();
  });

  it('swallows a fan-out failure so the domain write is never failed', async () => {
    const notificationWatchService = {
      notifyWatchersOfChange: jest
        .fn()
        .mockRejectedValue(new Error('fan-out down')),
    } as unknown as NotificationWatchService;
    const failingListener = new NotificationWatchListener(
      notificationWatchService,
    );

    await expect(
      failingListener.handleTaskUpdated({
        workspaceId: WORKSPACE_ID,
        events: [
          {
            properties: { after: { id: RECORD_ID }, updatedFields: ['status'] },
          } as unknown as ObjectRecordUpdateEvent<WatchedRecord>,
        ],
      } as unknown as WorkspaceEventBatch<
        ObjectRecordUpdateEvent<WatchedRecord>
      >),
    ).resolves.toBeUndefined();
  });
});
