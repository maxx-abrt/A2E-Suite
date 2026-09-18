import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type ChatMessageRecord } from 'src/modules/chat/services/chat-realtime-publisher.service';
import {
  type ChatMentionTarget,
  buildChatMentionNotificationRequests,
  extractMentionedWorkspaceMemberIds,
} from 'src/modules/chat/utils/chat-mention.util';

const WORKSPACE_MEMBER_OBJECT_NAME = 'workspaceMember';

// The workspace-object repository is untyped for this projection; the type
// describes exactly the select the query asks for (chat-realtime precedent).
type MentionedWorkspaceMemberRow = { id: string; userId: string };
type MentionedWorkspaceMemberRepository = {
  find(options: {
    where: { id: unknown };
    select: { id: true; userId: true };
  }): Promise<MentionedWorkspaceMemberRow[]>;
};

// Turns the mention ids encoded in a saved chat message into notification
// requests on the P8.1 producer seam. It deliberately owns no storage and no
// parser beyond the shared wire format: the feedback loop is write → notification
// service → (P8.2) inbox, so a chat mention lands in the same inbox as every
// other notification type.
@Injectable()
export class ChatMentionService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
  ) {}

  async notifyMessageMentions({
    workspaceId,
    message,
  }: {
    workspaceId: string;
    message: ChatMessageRecord;
  }): Promise<void> {
    const mentionedWorkspaceMemberIds = extractMentionedWorkspaceMemberIds(
      message.body,
    );

    if (mentionedWorkspaceMemberIds.length === 0) {
      return;
    }

    const targets = await this.resolveMentionTargets({
      workspaceId,
      mentionedWorkspaceMemberIds,
    });

    if (targets.length === 0) {
      return;
    }

    this.notificationService.requestNotifications({
      workspaceId,
      requests: buildChatMentionNotificationRequests({
        channelId: message.channelId,
        messageId: message.id,
        authorId: message.authorId,
        mentionedWorkspaceMemberIds,
        targets,
        createdAt: new Date(message.createdAt),
      }),
    });
  }

  // Mentions carry workspaceMember ids (what the composer inserts); the
  // notification contract is per-user, so this is the one member→user hop. A
  // mention of a removed member simply drops out.
  private async resolveMentionTargets({
    workspaceId,
    mentionedWorkspaceMemberIds,
  }: {
    workspaceId: string;
    mentionedWorkspaceMemberIds: string[];
  }): Promise<ChatMentionTarget[]> {
    const rows = await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const repository =
          this.workspaceOrmManager.getRepository<MentionedWorkspaceMemberRepository>(
            WORKSPACE_MEMBER_OBJECT_NAME,
            { shouldBypassPermissionChecks: true },
          );

        return (await repository.find({
          where: { id: In(mentionedWorkspaceMemberIds) },
          select: { id: true, userId: true },
        })) as unknown as MentionedWorkspaceMemberRow[];
      },
      buildSystemAuthContext(workspaceId),
    );

    return rows
      .filter((row) => row.userId !== null && row.userId !== undefined)
      .map((row) => ({
        workspaceMemberId: row.id,
        userId: row.userId,
      }));
  }
}
