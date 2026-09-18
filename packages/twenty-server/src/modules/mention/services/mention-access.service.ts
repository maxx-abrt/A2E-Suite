import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import {
  RealtimeTopicAccessService,
  type RealtimeWorkspaceMemberIdentity,
} from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-access.service';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import {
  type MentionSource,
  type MentionTarget,
} from 'src/modules/mention/types/mention.type';

const DOCUMENT_OBJECT_NAME = 'document';

// The mention-specific permission question: "may the mentioned member read the
// thing they were mentioned in?". It reuses the P2.1 record/channel ACL
// primitive rather than re-deriving access, so a private channel or a document
// the member's role cannot read suppresses the notification (and its snippet).
@Injectable()
// oxlint-disable-next-line twenty/inject-workspace-repository -- UserWorkspaceService is the core user↔workspace lookup (its id feeds buildUserAuthContext), not an injected workspace repository.
export class MentionAccessService {
  constructor(
    private readonly userWorkspaceService: UserWorkspaceService,
    private readonly realtimeTopicAccessService: RealtimeTopicAccessService,
  ) {}

  async canMentionTargetReadSource({
    workspaceId,
    target,
    source,
  }: {
    workspaceId: string;
    target: MentionTarget;
    source: MentionSource;
  }): Promise<boolean> {
    try {
      const userWorkspace =
        await this.userWorkspaceService.getUserWorkspaceForUser({
          userId: target.userId,
          workspaceId,
          relations: [],
        });

      if (!isDefined(userWorkspace)) {
        return false;
      }

      const identity: RealtimeWorkspaceMemberIdentity = {
        workspaceId,
        userId: target.userId,
        workspaceMemberId: target.workspaceMemberId,
        userWorkspaceId: userWorkspace.id,
      };

      switch (source.surface) {
        case 'chat':
          return await this.realtimeTopicAccessService.canWorkspaceMemberReadChatChannel(
            { identity, channelId: source.channelId },
          );

        case 'document':
        case 'comment':
          return await this.realtimeTopicAccessService.canWorkspaceMemberReadObjectRecord(
            {
              identity,
              objectNameSingular: DOCUMENT_OBJECT_NAME,
              recordId: source.documentId,
            },
          );
      }
    } catch {
      return false;
    }
  }
}
