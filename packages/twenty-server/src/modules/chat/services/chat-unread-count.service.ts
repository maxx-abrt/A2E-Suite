import { ForbiddenException, Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { resolveRolePermissionConfig } from 'src/engine/twenty-orm/utils/resolve-role-permission-config.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

import {
  aggregateUnreadCounts,
  type ChatReadPosition,
  type ChatUnreadMessage,
} from '../utils/chat-unread-count.util';

// Relations surface on the workspace row as `${fieldName}Id` (the engine
// derives the column from the relation field name, not from the SDK
// joinColumnName): chatReadCursor.channel -> channelId,
// chatReadCursor.workspaceMember -> workspaceMemberId.
type ChatReadCursorRow = {
  channelId: string;
  lastReadAt: string | null;
};

type ChatReadCursorRepository = {
  find(options: {
    where: unknown;
    select: { channelId: true; lastReadAt: true };
  }): Promise<ChatReadCursorRow[]>;
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

export type ChatUnreadCount = {
  channelId: string;
  unreadCount: number;
};

// Unread state for one member across the channels they follow (have a read
// cursor in). The aggregation is the same pure util the realtime read event
// uses, so the REST query and the live event can never disagree.
@Injectable()
export class ChatUnreadCountService {
  constructor(private readonly workspaceOrmManager: WorkspaceOrmManager) {}

  async listUnreadCounts({
    workspaceId,
    workspaceMemberId,
  }: {
    workspaceId: string;
    workspaceMemberId: string;
  }): Promise<ChatUnreadCount[]> {
    return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
      const context = getWorkspaceContext();

      if (context.authContext.workspace.id !== workspaceId) {
        throw new ForbiddenException(
          'Chat unread counts can only be read in the authenticated workspace',
        );
      }

      const rolePermissionConfig =
        resolveRolePermissionConfig({
          authContext: context.authContext,
          userWorkspaceRoleMap: context.userWorkspaceRoleMap,
          apiKeyRoleMap: context.apiKeyRoleMap,
        }) ?? undefined;

      const readCursorRepository =
        this.workspaceOrmManager.getRepository<ChatReadCursorRepository>(
          'chatReadCursor',
          rolePermissionConfig,
        );

      // The generic above is the repository shape (the a2e-projects search
      // provider / ChatMessageService pattern); the projection is the rows.
      const readCursors = (await readCursorRepository.find({
        where: { workspaceMemberId: workspaceMemberId },
        select: { channelId: true, lastReadAt: true },
      })) as unknown as ChatReadCursorRow[];

      const channelIds = [
        ...new Set(readCursors.map((cursor) => cursor.channelId)),
      ];

      if (channelIds.length === 0) {
        return [];
      }

      // Only the followed channels are read back: the member's read position is
      // the scope, so a foreign channel can never contribute unread messages.
      const messageRepository =
        this.workspaceOrmManager.getRepository<ChatUnreadMessageRepository>(
          'chatMessage',
          rolePermissionConfig,
        );

      const messages = (await messageRepository.find({
        where: { channelId: In(channelIds) },
        select: {
          channelId: true,
          authorId: true,
          createdAt: true,
          deletedAt: true,
        },
      })) as unknown as ChatUnreadMessage[];

      const readPositions: ChatReadPosition[] = readCursors.map((cursor) => ({
        channelId: cursor.channelId,
        lastReadAt: cursor.lastReadAt,
      }));

      const unreadCounts = aggregateUnreadCounts({
        messages,
        readPositions,
        workspaceMemberId,
      });

      return channelIds.map((channelId) => ({
        channelId,
        unreadCount: unreadCounts[channelId] ?? 0,
      }));
    });
  }
}
