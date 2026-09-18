import { Logger } from '@nestjs/common';

import { type ObjectRecordCreateEvent } from 'twenty-shared/database-events';

import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { ChatMentionListener } from 'src/modules/chat/listeners/chat-mention.listener';
import { ChatMentionService } from 'src/modules/chat/services/chat-mention.service';
import { type ChatMessageRecord } from 'src/modules/chat/services/chat-realtime-publisher.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const MESSAGE_ID = 'c31c0300-0000-4000-8000-000000000000';

const message: ChatMessageRecord = {
  id: MESSAGE_ID,
  channelId: CHANNEL_ID,
  authorId: '20202020-77d5-4cb6-b60a-f4a835a85d61',
  body: 'hello',
  threadParentId: null,
  createdAt: '2026-09-18T19:32:52.000Z',
  editedAt: null,
  deletedAt: null,
};

const buildBatch = (): WorkspaceEventBatch<
  ObjectRecordCreateEvent<ChatMessageRecord>
> =>
  ({
    name: 'chatMessage.created',
    workspaceId: WORKSPACE_ID,
    events: [{ properties: { after: message } }],
  }) as unknown as WorkspaceEventBatch<
    ObjectRecordCreateEvent<ChatMessageRecord>
  >;

describe('ChatMentionListener', () => {
  let notifyMessageMentions: jest.Mock;
  let listener: ChatMentionListener;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    notifyMessageMentions = jest.fn().mockResolvedValue(undefined);
    listener = new ChatMentionListener({
      notifyMessageMentions,
    } as unknown as ChatMentionService);
  });

  it('forwards a created message to the mention service', async () => {
    await listener.handleMessageCreated(buildBatch());

    expect(notifyMessageMentions).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      message,
    });
  });

  it('swallows mention failures (notifications are best-effort)', async () => {
    notifyMessageMentions.mockRejectedValue(new Error('db down'));

    await expect(
      listener.handleMessageCreated(buildBatch()),
    ).resolves.toBeUndefined();
  });
});
