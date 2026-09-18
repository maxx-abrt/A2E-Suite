import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import {
  CHAT_MESSAGE_CREATED_EVENT_TYPE,
  CHAT_MESSAGE_DELETED_EVENT_TYPE,
  CHAT_REACTION_CREATED_EVENT_TYPE,
  CHAT_READ_UPDATED_EVENT_TYPE,
} from 'src/modules/chat/utils/chat-realtime-event.util';
import {
  ChatRealtimePublisherService,
  type ChatMessageRecord,
} from 'src/modules/chat/services/chat-realtime-publisher.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const MESSAGE_ID = 'c31c0300-0000-4000-8000-000000000000';
const WORKSPACE_MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
const OTHER_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';
const TOPIC = `workspace:${WORKSPACE_ID}:chat:${CHANNEL_ID}`;

const messageRecord: ChatMessageRecord = {
  id: MESSAGE_ID,
  channelId: CHANNEL_ID,
  authorId: WORKSPACE_MEMBER_ID,
  body: 'hello',
  threadParentId: null,
  createdAt: '2026-09-18T10:00:00.000Z',
  editedAt: null,
  deletedAt: null,
};

const buildService = ({
  findOne = jest.fn(),
  find = jest.fn().mockResolvedValue([]),
}: {
  findOne?: jest.Mock;
  find?: jest.Mock;
} = {}) => {
  const publish = jest.fn().mockResolvedValue(undefined);
  const getRepository = jest.fn(() => ({ findOne, find }));
  const ormManager = {
    executeInWorkspaceContext: (fn: () => Promise<unknown>) => fn(),
    getRepository,
  } as unknown as WorkspaceOrmManager;
  const publisher = { publish } as unknown as RealtimePublisherService;
  const service = new ChatRealtimePublisherService(publisher, ormManager);

  return { service, publish, getRepository, findOne, find };
};

describe('ChatRealtimePublisherService', () => {
  it('publishes a created message on the channel topic', async () => {
    const { service, publish, getRepository } = buildService();

    await service.publishMessageEvent({
      workspaceId: WORKSPACE_ID,
      action: DatabaseEventAction.CREATED,
      message: messageRecord,
    });

    expect(publish).toHaveBeenCalledWith(
      TOPIC,
      expect.objectContaining({
        type: CHAT_MESSAGE_CREATED_EVENT_TYPE,
        workspaceId: WORKSPACE_ID,
        channelId: CHANNEL_ID,
      }),
    );
    // Messages carry their channel, so no lookup is needed.
    expect(getRepository).not.toHaveBeenCalled();
  });

  it('publishes a deleted message with the deleted event type', async () => {
    const { service, publish } = buildService();

    await service.publishMessageEvent({
      workspaceId: WORKSPACE_ID,
      action: DatabaseEventAction.DESTROYED,
      message: { ...messageRecord, deletedAt: '2026-09-18T11:00:00.000Z' },
    });

    expect(publish).toHaveBeenCalledWith(
      TOPIC,
      expect.objectContaining({ type: CHAT_MESSAGE_DELETED_EVENT_TYPE }),
    );
  });

  it('resolves a reaction message to its channel before publishing', async () => {
    const findOne = jest.fn().mockResolvedValue({ channelId: CHANNEL_ID });
    const { service, publish, getRepository } = buildService({ findOne });

    await service.publishReactionEvent({
      workspaceId: WORKSPACE_ID,
      action: DatabaseEventAction.CREATED,
      reaction: {
        id: 'reaction-1',
        reactionMessageId: MESSAGE_ID,
        reactionWorkspaceMemberId: WORKSPACE_MEMBER_ID,
        emoji: '🎉',
      },
    });

    expect(getRepository).toHaveBeenCalledWith('chatMessage', {
      shouldBypassPermissionChecks: true,
    });
    expect(findOne).toHaveBeenCalledWith({
      where: { id: MESSAGE_ID },
      select: { channelId: true },
    });
    expect(publish).toHaveBeenCalledWith(
      TOPIC,
      expect.objectContaining({
        type: CHAT_REACTION_CREATED_EVENT_TYPE,
        channelId: CHANNEL_ID,
        reaction: {
          id: 'reaction-1',
          messageId: MESSAGE_ID,
          workspaceMemberId: WORKSPACE_MEMBER_ID,
          emoji: '🎉',
        },
      }),
    );
  });

  it('skips a reaction whose message resolves to no channel', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const { service, publish } = buildService({ findOne });

    await service.publishReactionEvent({
      workspaceId: WORKSPACE_ID,
      action: DatabaseEventAction.CREATED,
      reaction: {
        id: 'reaction-1',
        reactionMessageId: MESSAGE_ID,
        reactionWorkspaceMemberId: WORKSPACE_MEMBER_ID,
        emoji: '🎉',
      },
    });

    expect(publish).not.toHaveBeenCalled();
  });

  it('aggregates the unread count into the read event', async () => {
    const find = jest.fn().mockResolvedValue([
      {
        channelId: CHANNEL_ID,
        authorId: OTHER_MEMBER_ID,
        createdAt: '2026-09-18T11:00:00.000Z',
        deletedAt: null,
      },
      {
        channelId: CHANNEL_ID,
        authorId: WORKSPACE_MEMBER_ID,
        createdAt: '2026-09-18T11:30:00.000Z',
        deletedAt: null,
      },
    ]);
    const { service, publish } = buildService({ find });

    await service.publishReadEvent({
      workspaceId: WORKSPACE_ID,
      record: {
        readCursorChannelId: CHANNEL_ID,
        readCursorWorkspaceMemberId: WORKSPACE_MEMBER_ID,
        lastReadMessageId: MESSAGE_ID,
        lastReadAt: '2026-09-18T10:00:00.000Z',
      },
    });

    expect(publish).toHaveBeenCalledWith(
      TOPIC,
      expect.objectContaining({
        type: CHAT_READ_UPDATED_EVENT_TYPE,
        channelId: CHANNEL_ID,
        read: expect.objectContaining({
          workspaceMemberId: WORKSPACE_MEMBER_ID,
          lastReadMessageId: MESSAGE_ID,
          lastReadAt: '2026-09-18T10:00:00.000Z',
          unreadCount: 1,
        }),
      }),
    );
  });

  it('skips a read event with no member to aggregate for', async () => {
    const { service, publish, getRepository } = buildService();

    await service.publishReadEvent({
      workspaceId: WORKSPACE_ID,
      record: {
        readCursorChannelId: CHANNEL_ID,
        readCursorWorkspaceMemberId: null,
        lastReadMessageId: MESSAGE_ID,
        lastReadAt: null,
      },
    });

    expect(publish).not.toHaveBeenCalled();
    expect(getRepository).not.toHaveBeenCalled();
  });
});
