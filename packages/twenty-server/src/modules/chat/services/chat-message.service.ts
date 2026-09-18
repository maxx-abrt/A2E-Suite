import { ForbiddenException, Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { Equal, LessThan } from 'typeorm';

import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { resolveRolePermissionConfig } from 'src/engine/twenty-orm/utils/resolve-role-permission-config.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

import {
  type ChatMessagePage,
  type ChatMessageRecord,
} from '../types/chat-message.type';
import {
  buildChatMessagePage,
  decodeChatMessageCursor,
} from '../utils/chat-message-cursor.util';

export const DEFAULT_CHAT_MESSAGE_PAGE_SIZE = 50;
export const MAX_CHAT_MESSAGE_PAGE_SIZE = 100;

// The workspace-object repository is untyped for this projection; the type
// describes exactly the select the query asks for (same pattern as the
// a2e-projects search provider).
type ChatMessageWorkspaceRepository = {
  find(options: {
    where: unknown;
    order: { createdAt: 'DESC'; id: 'DESC' };
    take: number;
    select: {
      id: true;
      body: true;
      channelId: true;
      authorId: true;
      threadParentId: true;
      createdAt: true;
      editedAt: true;
      deletedAt: true;
    };
  }): Promise<ChatMessageRecord[]>;
};

@Injectable()
export class ChatMessageService {
  constructor(private readonly workspaceOrmManager: WorkspaceOrmManager) {}

  // Newest-first keyset page over one channel's history. `workspaceId` is the
  // authenticated caller's workspace: it must match the ambient ORM context,
  // so a caller can never widen the read by passing a foreign workspace id.
  // Repository permissions come from the ambient context too, so a role that
  // cannot read chatMessage gets an empty page, never an unscoped one.
  async listChannelMessages({
    workspaceId,
    channelId,
    limit,
    after,
  }: {
    workspaceId: string;
    channelId: string;
    limit?: number;
    after?: string;
  }): Promise<ChatMessagePage> {
    const pageSize = Math.min(
      Math.max(isDefined(limit) ? limit : DEFAULT_CHAT_MESSAGE_PAGE_SIZE, 1),
      MAX_CHAT_MESSAGE_PAGE_SIZE,
    );
    const cursor = isDefined(after) ? decodeChatMessageCursor(after) : null;

    return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
      const context = getWorkspaceContext();

      if (context.authContext.workspace.id !== workspaceId) {
        throw new ForbiddenException(
          'Chat messages can only be read in the authenticated workspace',
        );
      }

      const rolePermissionConfig =
        resolveRolePermissionConfig({
          authContext: context.authContext,
          userWorkspaceRoleMap: context.userWorkspaceRoleMap,
          apiKeyRoleMap: context.apiKeyRoleMap,
        }) ?? undefined;

      const repository =
        this.workspaceOrmManager.getRepository<ChatMessageWorkspaceRepository>(
          'chatMessage',
          rolePermissionConfig,
        );

      // The workspace never appears in the WHERE clause: tables are
      // per-workspace schemas selected by the ambient context. Only the
      // channel and the keyset cursor narrow this page.
      const where = isDefined(cursor)
        ? [
            {
              channelId,
              createdAt: LessThan(new Date(cursor.createdAt)),
            },
            {
              channelId,
              createdAt: Equal(new Date(cursor.createdAt)),
              id: LessThan(cursor.id),
            },
          ]
        : { channelId };

      // The generic is the repository shape above (the a2e-projects search
      // provider pattern); the projection it returns is ChatMessageRecord[].
      const records = (await repository.find({
        where,
        order: { createdAt: 'DESC', id: 'DESC' },
        take: pageSize + 1,
        select: {
          id: true,
          body: true,
          channelId: true,
          authorId: true,
          threadParentId: true,
          createdAt: true,
          editedAt: true,
          deletedAt: true,
        },
      })) as unknown as ChatMessageRecord[];

      return buildChatMessagePage({ records, limit: pageSize });
    });
  }
}
