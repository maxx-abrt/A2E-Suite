import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type AccessTokenJwtPayload } from 'src/engine/core-modules/auth/types/access-token-jwt-payload.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { type WorkspaceAgnosticTokenJwtPayload } from 'src/engine/core-modules/auth/types/workspace-agnostic-token-jwt-payload.type';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { UserSessionService } from 'src/engine/core-modules/user-session/services/user-session.service';
import { isUserSessionToken } from 'src/engine/core-modules/user-session/utils/is-user-session-token.util';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { type RealtimeAuthenticatedSocketContext } from '../types/realtime-topic-context.type';
import { parseRealtimeTopic } from '../utils/parse-realtime-topic.util';

// Authorization is evaluated per topic at subscribe time, never on publish:
// publishers are server-side code.
//
// Credentials reuse the HTTP contract (audit F02): the session cookie token is
// resolved through UserSessionService — the same resolution GraphQL uses, so
// expiry and revocation apply within its cache TTL — or a short-lived JWT is
// verified directly. Membership is re-checked against the workspace member
// cache on every authenticate call (the gateway calls it for every subscribe,
// it never trusts a cached socket context), so a removed member loses
// realtime access without waiting for token expiry.
@Injectable()
export class RealtimeTopicAuthorizationService {
  private readonly logger = new Logger(RealtimeTopicAuthorizationService.name);

  constructor(
    private readonly jwtWrapperService: JwtWrapperService,
    private readonly userSessionService: UserSessionService,
    private readonly workspaceCacheService: WorkspaceCacheService,
  ) {}

  async authenticate(
    token: string | undefined,
  ): Promise<RealtimeAuthenticatedSocketContext> {
    if (!isDefined(token)) {
      throw new Error('Missing realtime auth token');
    }

    const payload = isUserSessionToken(token)
      ? (await this.userSessionService.resolveSession(token)).payload
      : ((await this.jwtWrapperService.verifyJwtToken(token, {
          ignoreExpiration: false,
        })) as AccessTokenJwtPayload | WorkspaceAgnosticTokenJwtPayload);

    if (payload.type === JwtTokenTypeEnum.WORKSPACE_AGNOSTIC) {
      // Workspace-agnostic tokens cannot prove membership of any workspace.
      throw new Error('Workspace-agnostic tokens cannot subscribe to topics');
    }

    if (payload.type !== JwtTokenTypeEnum.ACCESS) {
      throw new Error(
        'Only access tokens or session tokens can subscribe to topics',
      );
    }

    const workspaceMemberId = await this.resolveWorkspaceMemberIdOrThrow({
      workspaceId: payload.workspaceId,
      userId: payload.userId,
    });

    return {
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      workspaceMemberId,
      isWorkspaceAgnostic: false,
    };
  }

  // Live sockets outlive a membership change, so membership is revalidated on
  // each heartbeat as well as at subscribe: a removed member must lose the
  // topics already granted, and a re-joined member gets a new member id, which
  // forces a fresh subscribe that re-resolves the context.
  async assertStillAMember(
    socketContext: RealtimeAuthenticatedSocketContext,
  ): Promise<void> {
    const workspaceMemberId = await this.resolveWorkspaceMemberIdOrThrow({
      workspaceId: socketContext.workspaceId,
      userId: socketContext.userId,
    });

    if (workspaceMemberId !== socketContext.workspaceMemberId) {
      throw new Error('Workspace membership changed; resubscribe required');
    }
  }

  private async resolveWorkspaceMemberIdOrThrow({
    workspaceId,
    userId,
  }: {
    workspaceId: string;
    userId: string;
  }): Promise<string> {
    const { flatWorkspaceMemberMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatWorkspaceMemberMaps',
      ]);

    const workspaceMemberId = flatWorkspaceMemberMaps.idByUserId[userId];

    if (!isDefined(workspaceMemberId)) {
      throw new Error('User is not a member of the workspace');
    }

    return workspaceMemberId;
  }

  assertTopicAuthorized(
    socketContext: RealtimeAuthenticatedSocketContext,
    topic: string,
  ): void {
    const topicContext = parseRealtimeTopic(topic);

    if (socketContext.isWorkspaceAgnostic) {
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
