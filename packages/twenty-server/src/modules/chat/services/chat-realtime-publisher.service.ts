import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { IsNull, MoreThan } from 'typeorm';

import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

import {
  CHAT_MESSAGE_CREATED_EVENT_TYPE,
  CHAT_MESSAGE_DELETED_EVENT_TYPE,
  CHAT_MESSAGE_UPDATED_EVENT_TYPE,
  CHAT_REACTION_CREATED_EVENT_TYPE,
  CHAT_REACTION_DELETED_EVENT_TYPE,
  type ChatMessageEventType,
  type ChatRealtimeMessage,
  type ChatRealtimeReaction,
  type ChatReactionEventType,
  buildChatMessageRealtimeEvent,
  buildChatReactionRealtimeEvent,
  buildChatReadRealtimeEvent,
} from '../utils/chat-realtime-event.util';
import { buildChatChannelTopic } from '../utils/chat-topic.util';
import {
  aggregateUnreadCounts,
  type ChatUnreadMessage,
} from '../utils/chat-unread-count.util';

// Raw workspace rows the listener hands over. They are the app-owned object
// rows, so relations surface as their join columns (chatMessage.channelId,
// chatReaction.reactionMessageId, chatReadCursor.readCursorChannelId) — the
// same seam RealtimeTopicAccessService reads for channel ACLs.
export type ChatMessageRecord = ChatRealtimeMessage;

export type ChatReactionRecord = {
  id: string;
  reactionMessageId: string;
  reactionWorkspaceMemberId: string | null;
  emoji: string;
};

export type ChatReadCursorRecord = {
  readCursorChannelId: string;
  readCursorWorkspaceMemberId: string | null;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
};

type ChatMessageChannelRow = { channelId?: string | null };
type ChatMessageChannelRepository = {
  findOne(options: {
    where: { id: string };
    select: { channelId: true };
  }): Promise<ChatMessageChannelRow | null>;
};

type ChatUnreadMessageRepository = {
  find(options: {
    where: unknown;
    select: {
      channelId: true;
      authorId: true;
      createdAt: true;
      deletedAt: true;
    };
  }): Promise<ChatUnreadMessage[]>;
};

// Turns durable chat writes into gateway publishes on the channel topic. The
// metadata engine owns the CRUD, so this service is fed by
// ChatRealtimeListener's database events rather than a second socket path.
// Lookups run as the workspace system context with permission checks bypassed
// because the fan-out is server-side, and every event still reaches only
// sockets the repaired gateway admitted under the channel ACL.
@Injectable()
export class ChatRealtimePublisherService {
  constructor(
    private readonly realtimePublisherService: RealtimePublisherService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
  ) {}

  async publishMessageEvent({
    workspaceId,
    action,
    message,
  }: {
    workspaceId: string;
    action: DatabaseEventAction;
    message: ChatMessageRecord;
  }): Promise<void> {
    const type = resolveMessageEventType(action);

    if (!isDefined(type)) {
      return;
    }

    await this.realtimePublisherService.publish(
      buildChatChannelTopic({
        workspaceId,
        channelId: message.channelId,
      }),
      buildChatMessageRealtimeEvent({
        type,
        workspaceId,
        message,
        occurredAt: new Date().toISOString(),
      }),
    );
  }

  async publishReactionEvent({
    workspaceId,
    action,
    reaction,
  }: {
    workspaceId: string;
    action: DatabaseEventAction;
    reaction: ChatReactionRecord;
  }): Promise<void> {
    const type = resolveReactionEventType(action);

    if (!isDefined(type)) {
      return;
    }

    const channelId = await this.resolveMessageChannelId({
      workspaceId,
      messageId: reaction.reactionMessageId,
    });

    if (!isDefined(channelId)) {
      return;
    }

    const payloadReaction: ChatRealtimeReaction = {
      id: reaction.id,
      messageId: reaction.reactionMessageId,
      workspaceMemberId: reaction.reactionWorkspaceMemberId,
      emoji: reaction.emoji,
    };

    await this.realtimePublisherService.publish(
      buildChatChannelTopic({ workspaceId, channelId }),
      buildChatReactionRealtimeEvent({
        type,
        workspaceId,
        channelId,
        reaction: payloadReaction,
        occurredAt: new Date().toISOString(),
      }),
    );
  }

  async publishReadEvent({
    workspaceId,
    record,
  }: {
    workspaceId: string;
    record: ChatReadCursorRecord;
  }): Promise<void> {
    const { readCursorChannelId, readCursorWorkspaceMemberId } = record;

    if (!isDefined(readCursorWorkspaceMemberId)) {
      return;
    }

    const unreadCount = await this.resolveUnreadCount({
      workspaceId,
      channelId: readCursorChannelId,
      workspaceMemberId: readCursorWorkspaceMemberId,
      lastReadAt: record.lastReadAt,
    });

    await this.realtimePublisherService.publish(
      buildChatChannelTopic({
        workspaceId,
        channelId: readCursorChannelId,
      }),
      buildChatReadRealtimeEvent({
        workspaceId,
        channelId: readCursorChannelId,
        occurredAt: new Date().toISOString(),
        read: {
          workspaceMemberId: readCursorWorkspaceMemberId,
          lastReadMessageId: record.lastReadMessageId,
          lastReadAt: record.lastReadAt,
          unreadCount,
        },
      }),
    );
  }

  private async resolveMessageChannelId({
    workspaceId,
    messageId,
  }: {
    workspaceId: string;
    messageId: string;
  }): Promise<string | null> {
    const record = await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const repository =
          this.workspaceOrmManager.getRepository<ChatMessageChannelRepository>(
            'chatMessage',
            { shouldBypassPermissionChecks: true },
          );

        const record = (await repository.findOne({
          where: { id: messageId },
          select: { channelId: true },
        })) as unknown as ChatMessageChannelRow | null;

        return record;
      },
      buildSystemAuthContext(workspaceId),
    );

    return record?.channelId ?? null;
  }

  private async resolveUnreadCount({
    workspaceId,
    channelId,
    workspaceMemberId,
    lastReadAt,
  }: {
    workspaceId: string;
    channelId: string;
    workspaceMemberId: string;
    lastReadAt: string | null;
  }): Promise<number> {
    const messages = await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const repository =
          this.workspaceOrmManager.getRepository<ChatUnreadMessageRepository>(
            'chatMessage',
            { shouldBypassPermissionChecks: true },
          );

        const rows = (await repository.find({
          where: {
            channelId,
            deletedAt: IsNull(),
            ...(isDefined(lastReadAt)
              ? { createdAt: MoreThan(new Date(lastReadAt)) }
              : {}),
          },
          select: {
            channelId: true,
            authorId: true,
            createdAt: true,
            deletedAt: true,
          },
        })) as unknown as ChatUnreadMessage[];

        return rows;
      },
      buildSystemAuthContext(workspaceId),
    );

    return (
      aggregateUnreadCounts({
        messages,
        readPositions: [{ channelId, lastReadAt }],
        workspaceMemberId,
      })[channelId] ?? 0
    );
  }
}

const resolveMessageEventType = (
  action: DatabaseEventAction,
): ChatMessageEventType | undefined => {
  switch (action) {
    case DatabaseEventAction.CREATED:
      return CHAT_MESSAGE_CREATED_EVENT_TYPE;
    case DatabaseEventAction.UPDATED:
    case DatabaseEventAction.RESTORED:
    case DatabaseEventAction.UPSERTED:
      return CHAT_MESSAGE_UPDATED_EVENT_TYPE;
    case DatabaseEventAction.DELETED:
    case DatabaseEventAction.DESTROYED:
      return CHAT_MESSAGE_DELETED_EVENT_TYPE;
    default:
      return undefined;
  }
};

const resolveReactionEventType = (
  action: DatabaseEventAction,
): ChatReactionEventType | undefined => {
  switch (action) {
    case DatabaseEventAction.CREATED:
    case DatabaseEventAction.UPSERTED:
      return CHAT_REACTION_CREATED_EVENT_TYPE;
    case DatabaseEventAction.DELETED:
    case DatabaseEventAction.DESTROYED:
      return CHAT_REACTION_DELETED_EVENT_TYPE;
    default:
      return undefined;
  }
};
