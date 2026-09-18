import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { In } from 'typeorm';

import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { MentionAccessService } from 'src/modules/mention/services/mention-access.service';
import {
  type MentionSource,
  type MentionTarget,
} from 'src/modules/mention/types/mention.type';
import { buildMentionNotificationPayload } from 'src/modules/mention/utils/build-mention-notification-payload.util';
import { filterPermittedMentionTargets } from 'src/modules/mention/utils/filter-permitted-mention-targets.util';
import { parseMentions } from 'src/modules/mention/utils/parse-mentions.util';
import { subtractMentionedWorkspaceMemberIds } from 'src/modules/mention/utils/subtract-mentioned-workspace-member-ids.util';

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

// The one mentions producer: every surface parses through the shared parser,
// resolves member→user, drops targets that cannot read the target and emits one
// MENTION request per permitted user on the P8.1 seam. It owns no storage, so
// docs, chat and comments land in the same inbox with the same preference and
// quiet-hours policy.
@Injectable()
export class MentionNotificationService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    private readonly mentionAccessService: MentionAccessService,
  ) {}

  async notifyMentions({
    workspaceId,
    source,
    body,
    authorId,
    createdAt,
    excludeWorkspaceMemberIds = [],
  }: {
    workspaceId: string;
    source: MentionSource;
    body: unknown;
    authorId: string | null;
    createdAt?: Date;
    // Mention ids already present in the previous revision: an edit does not
    // re-notify an existing mention (the comment/document listeners diff).
    excludeWorkspaceMemberIds?: string[];
  }): Promise<MentionTarget[]> {
    const extraction = parseMentions({ surface: source.surface, body });
    const candidateWorkspaceMemberIds = subtractMentionedWorkspaceMemberIds({
      mentionedWorkspaceMemberIds: extraction.mentionedWorkspaceMemberIds,
      alreadyMentionedWorkspaceMemberIds: excludeWorkspaceMemberIds,
    });

    if (candidateWorkspaceMemberIds.length === 0) {
      return [];
    }

    const targets = await this.resolveMentionTargets({
      workspaceId,
      mentionedWorkspaceMemberIds: candidateWorkspaceMemberIds,
    });

    if (targets.length === 0) {
      return [];
    }

    const permittedTargets = await filterPermittedMentionTargets({
      targets,
      canTargetRead: (target) =>
        this.mentionAccessService.canMentionTargetReadSource({
          workspaceId,
          target,
          source,
        }),
    });

    if (permittedTargets.length === 0) {
      return [];
    }

    this.notificationService.requestNotifications({
      workspaceId,
      requests: permittedTargets.map((target) => ({
        userId: target.userId,
        type: 'MENTION' as const,
        payload: buildMentionNotificationPayload({
          source,
          authorId,
          mentionedWorkspaceMemberIds: extraction.mentionedWorkspaceMemberIds,
          contextSnippet: extraction.contextSnippet,
        }),
        ...(createdAt === undefined ? {} : { createdAt }),
      })),
    });

    return permittedTargets;
  }

  // Mentions carry workspaceMember ids (what the editor/composer inserts); the
  // notification contract is per-user, so this is the one member→user hop. A
  // mention of a removed member simply drops out.
  private async resolveMentionTargets({
    workspaceId,
    mentionedWorkspaceMemberIds,
  }: {
    workspaceId: string;
    mentionedWorkspaceMemberIds: string[];
  }): Promise<MentionTarget[]> {
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
      .filter((row) => isDefined(row.userId))
      .map((row) => ({
        workspaceMemberId: row.id,
        userId: row.userId,
      }));
  }
}
