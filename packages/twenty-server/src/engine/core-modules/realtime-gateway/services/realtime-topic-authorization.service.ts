import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type AccessTokenJwtPayload } from 'src/engine/core-modules/auth/types/access-token-jwt-payload.type';
import { type WorkspaceAgnosticTokenJwtPayload } from 'src/engine/core-modules/auth/types/workspace-agnostic-token-jwt-payload.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { type RealtimeAuthenticatedSocketContext } from '../types/realtime-topic-context.type';
import { parseRealtimeTopic } from '../utils/parse-realtime-topic.util';

// Authorization is evaluated per topic at subscribe time, never on publish:
// publishers are server-side code. A socket is bound to the workspace of its
// first authorized subscription; cross-workspace topics are then rejected
// without re-authentication.
@Injectable()
export class RealtimeTopicAuthorizationService {
  private readonly logger = new Logger(RealtimeTopicAuthorizationService.name);

  constructor(private readonly jwtWrapperService: JwtWrapperService) {}

  async authenticate(
    token: string | undefined,
  ): Promise<RealtimeAuthenticatedSocketContext> {
    if (!isDefined(token)) {
      throw new Error('Missing realtime auth token');
    }

    const payload = (await this.jwtWrapperService.verifyJwtToken(token, {
      ignoreExpiration: false,
    })) as AccessTokenJwtPayload | WorkspaceAgnosticTokenJwtPayload;

    if (payload.type === JwtTokenTypeEnum.WORKSPACE_AGNOSTIC) {
      return {
        userId: payload.userId,
        workspaceId: '',
        isWorkspaceAgnostic: true,
      };
    }

    return {
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      workspaceMemberId: payload.workspaceMemberId,
      isWorkspaceAgnostic: false,
    };
  }

  assertTopicAuthorized(
    socketContext: RealtimeAuthenticatedSocketContext,
    topic: string,
  ): void {
    const topicContext = parseRealtimeTopic(topic);

    if (socketContext.isWorkspaceAgnostic) {
      // Workspace-agnostic tokens cannot prove membership of any workspace.
      throw new Error('Workspace-agnostic tokens cannot subscribe to topics');
    }

    if (topicContext.workspaceId !== socketContext.workspaceId) {
      throw new Error('Topic workspace does not match the authenticated one');
    }

    if (topicContext.kind === 'inbox' && isDefined(topicContext.userId)) {
      if (topicContext.userId !== socketContext.userId) {
        throw new Error('Inbox topics are scoped to the owning user');
      }
    }
  }
}
