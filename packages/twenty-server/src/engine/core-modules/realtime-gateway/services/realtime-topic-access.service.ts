import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import { type UserWorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { buildUserAuthContext } from 'src/engine/core-modules/auth/utils/build-user-auth-context.util';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

import { type RealtimeAuthenticatedSocketContext } from '../types/realtime-topic-context.type';

export const REALTIME_RECORD_ACCESS_DENIED_MESSAGE =
  'You do not have access to this record';
export const REALTIME_CHANNEL_ACCESS_DENIED_MESSAGE =
  'You do not have access to this channel';

const CHAT_CHANNEL_OBJECT_NAME = 'chatChannel';
const CHAT_CHANNEL_MEMBER_OBJECT_NAME = 'chatChannelMember';
const CHAT_CHANNEL_PRIVATE_VISIBILITY = 'PRIVATE';

type RealtimeCaller = {
  authContext: UserWorkspaceAuthContext;
  rolePermissionConfig: RolePermissionConfig;
};

// The member identity a record/channel ACL is evaluated for. The socket path
// reads it from the authenticated context; the mentions engine (P8.2) resolves
// it for a mentioned member, so both share one access decision.
export type RealtimeWorkspaceMemberIdentity = {
  workspaceId: string;
  userId: string;
  workspaceMemberId: string;
  userWorkspaceId: string;
};

// The workspace-object repository is untyped for app-defined objects; each type
// below is exactly the projection the query selects (document-share precedent).
type RealtimeObjectRecordRow = { id: string };
type RealtimeObjectRecordRepository = {
  findOne(options: {
    where: { id: string };
    select: { id: true };
  }): Promise<RealtimeObjectRecordRow | null>;
};

type RealtimeChatChannelRow = { id: string; visibility?: string | null };
type RealtimeChatChannelRepository = {
  findOne(options: {
    where: { id: string };
    select: { id: true; visibility: true };
  }): Promise<RealtimeChatChannelRow | null>;
};

type RealtimeChatChannelMemberRepository = {
  findOne(options: {
    where: {
      membershipChannelId: string;
      membershipWorkspaceMemberId: string;
    };
    select: { id: true };
  }): Promise<{ id: string } | null>;
};

// Record- and channel-level topic ACLs, evaluated at subscribe and re-evaluated
// on the heartbeat (P0.3 revocation contract). The workspace/member checks live
// in RealtimeTopicAuthorizationService; this service answers the narrower
// question "may this member read that record / channel" through the normal
// caller-permissioned repository so role, field and row-level permissions all
// apply — a private document topic cannot leak to a socket whose role or RLS
// predicates exclude the record. Every failure (unknown object, uninstalled
// app, missing role) collapses to deny so install/authorization state never
// leaks.
@Injectable()
export class RealtimeTopicAccessService {
  constructor(
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
  ) {}

  async assertCanAccessObjectRecord({
    socketContext,
    objectNameSingular,
    recordId,
  }: {
    socketContext: RealtimeAuthenticatedSocketContext;
    objectNameSingular: string;
    recordId: string;
  }): Promise<void> {
    const caller = await this.resolveCallerOrNull(socketContext);

    if (
      !isDefined(caller) ||
      !(await this.canReadObjectRecord({
        caller,
        objectNameSingular,
        recordId,
      }))
    ) {
      throw new Error(REALTIME_RECORD_ACCESS_DENIED_MESSAGE);
    }
  }

  // Non-throwing variants for the mentions engine: a denied mention is dropped
  // silently, never surfaced as an error to the producer.
  async canWorkspaceMemberReadObjectRecord({
    identity,
    objectNameSingular,
    recordId,
  }: {
    identity: RealtimeWorkspaceMemberIdentity;
    objectNameSingular: string;
    recordId: string;
  }): Promise<boolean> {
    const caller = await this.resolveCallerOrNull(identity);

    return isDefined(caller)
      ? this.canReadObjectRecord({ caller, objectNameSingular, recordId })
      : false;
  }

  async canWorkspaceMemberReadChatChannel({
    identity,
    channelId,
  }: {
    identity: RealtimeWorkspaceMemberIdentity;
    channelId: string;
  }): Promise<boolean> {
    const caller = await this.resolveCallerOrNull(identity);

    return isDefined(caller)
      ? this.canReadChatChannel({
          caller,
          workspaceMemberId: identity.workspaceMemberId,
          channelId,
        })
      : false;
  }

  async assertCanAccessChatChannel({
    socketContext,
    channelId,
  }: {
    socketContext: RealtimeAuthenticatedSocketContext;
    channelId: string;
  }): Promise<void> {
    const caller = await this.resolveCallerOrNull(socketContext);

    if (
      !isDefined(caller) ||
      !(await this.canReadChatChannel({
        caller,
        workspaceMemberId: socketContext.workspaceMemberId,
        channelId,
      }))
    ) {
      throw new Error(REALTIME_CHANNEL_ACCESS_DENIED_MESSAGE);
    }
  }

  // Membership is the only source of the caller's role here, so absence of the
  // cache entries fails closed rather than defaulting to a permissive context.
  private async resolveCallerOrNull(identity: {
    workspaceId: string;
    userId: string;
    workspaceMemberId?: string | undefined;
    userWorkspaceId?: string | undefined;
  }): Promise<RealtimeCaller | null> {
    const { workspaceId, userId, workspaceMemberId, userWorkspaceId } =
      identity;

    if (!isDefined(workspaceMemberId) || !isDefined(userWorkspaceId)) {
      return null;
    }

    const { userWorkspaceRoleMap, flatWorkspaceMemberMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'userWorkspaceRoleMap',
        'flatWorkspaceMemberMaps',
      ]);

    const roleId = userWorkspaceRoleMap[userWorkspaceId];
    const workspaceMember = flatWorkspaceMemberMaps.byId[workspaceMemberId];

    if (!isDefined(roleId) || !isDefined(workspaceMember)) {
      return null;
    }

    // The cached member is already the flat projection the repository reads for
    // row-level predicates; only the type surface differs from the entity.
    const authContext = buildUserAuthContext({
      workspace: { id: workspaceId } as FlatWorkspace,
      userWorkspaceId,
      user: { id: userId } as FlatAuthContextUser,
      workspaceMemberId,
      workspaceMember:
        workspaceMember as unknown as WorkspaceMemberWorkspaceEntity,
    });

    return {
      authContext,
      rolePermissionConfig: { intersectionOf: [roleId] },
    };
  }

  private async canReadObjectRecord({
    caller,
    objectNameSingular,
    recordId,
  }: {
    caller: RealtimeCaller;
    objectNameSingular: string;
    recordId: string;
  }): Promise<boolean> {
    try {
      return await this.workspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const repository =
            this.workspaceOrmManager.getRepository<RealtimeObjectRecordRepository>(
              objectNameSingular,
              caller.rolePermissionConfig,
            );

          const record = (await repository.findOne({
            where: { id: recordId },
            select: { id: true },
          })) as unknown as RealtimeObjectRecordRow | null;

          return isDefined(record);
        },
        caller.authContext,
      );
    } catch {
      return false;
    }
  }

  private async canReadChatChannel({
    caller,
    workspaceMemberId,
    channelId,
  }: {
    caller: RealtimeCaller;
    workspaceMemberId: string | undefined;
    channelId: string;
  }): Promise<boolean> {
    if (!isDefined(workspaceMemberId)) {
      return false;
    }

    try {
      return await this.workspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const channelRepository =
            this.workspaceOrmManager.getRepository<RealtimeChatChannelRepository>(
              CHAT_CHANNEL_OBJECT_NAME,
              caller.rolePermissionConfig,
            );

          const channel = (await channelRepository.findOne({
            where: { id: channelId },
            select: { id: true, visibility: true },
          })) as unknown as RealtimeChatChannelRow | null;

          if (!isDefined(channel)) {
            return false;
          }

          if (channel.visibility !== CHAT_CHANNEL_PRIVATE_VISIBILITY) {
            return true;
          }

          const membershipRepository =
            this.workspaceOrmManager.getRepository<RealtimeChatChannelMemberRepository>(
              CHAT_CHANNEL_MEMBER_OBJECT_NAME,
              caller.rolePermissionConfig,
            );

          const membership = await membershipRepository.findOne({
            where: {
              membershipChannelId: channelId,
              membershipWorkspaceMemberId: workspaceMemberId,
            },
            select: { id: true },
          });

          return isDefined(membership);
        },
        caller.authContext,
      );
    } catch {
      return false;
    }
  }
}
