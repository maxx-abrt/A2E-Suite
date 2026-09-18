import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'twenty-shared/utils';
import { type Repository } from 'typeorm';

import { type NotificationWatchTargetKind } from 'src/engine/core-modules/notification/constants/notification-watch-target-kind.constant';
import { NotificationWatchEntity } from 'src/engine/core-modules/notification/notification-watch.entity';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { buildWatchNotificationPayload } from 'src/engine/core-modules/notification/utils/build-watch-notification-payload.util';
import { RealtimeTopicAccessService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-access.service';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

const DOCUMENT_OBJECT_NAME = 'document';

// The one watch primitive: every watchable surface (record / document /
// channel) is a row here, so a single lifecycle (watch/unwatch) and a single
// change→notification path cover all three (C5 — no per-surface watch systems).
// It reuses the P8.1 notification seam for delivery and the P2.1 ACL primitive
// to drop a watch the member can no longer read (removed member or revoked
// record/channel access).
@Injectable()
// oxlint-disable-next-line twenty/inject-workspace-repository -- UserWorkspaceService is the core user↔workspace lookup (its id feeds the P2.1 member identity), not an injected workspace repository.
export class NotificationWatchService {
  private readonly logger = new Logger(NotificationWatchService.name);

  constructor(
    // Core-schema table read/written by (workspaceId, userId) from a change
    // listener with no ambient workspace ORM context, like notification itself.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(NotificationWatchEntity)
    private readonly notificationWatchRepository: Repository<NotificationWatchEntity>,
    private readonly notificationService: NotificationService,
    private readonly realtimeTopicAccessService: RealtimeTopicAccessService,
    private readonly userWorkspaceService: UserWorkspaceService,
    private readonly workspaceCacheService: WorkspaceCacheService,
  ) {}

  async watch({
    workspaceId,
    userId,
    targetKind,
    targetId,
  }: {
    workspaceId: string;
    userId: string;
    targetKind: NotificationWatchTargetKind;
    targetId: string | null;
  }): Promise<NotificationWatchEntity> {
    const existing = await this.findWatch({
      workspaceId,
      userId,
      targetKind,
      targetId,
    });

    if (isDefined(existing)) {
      return existing;
    }

    return this.notificationWatchRepository.save(
      this.notificationWatchRepository.create({
        workspaceId,
        userId,
        targetKind,
        targetId,
      }),
    );
  }

  async unwatch({
    workspaceId,
    userId,
    targetKind,
    targetId,
  }: {
    workspaceId: string;
    userId: string;
    targetKind: NotificationWatchTargetKind;
    targetId: string | null;
  }): Promise<boolean> {
    const { affected } = await this.notificationWatchRepository.delete({
      workspaceId,
      userId,
      targetKind,
      ...(isDefined(targetId) ? { targetId } : {}),
    });

    return (affected ?? 0) > 0;
  }

  async isWatching({
    workspaceId,
    userId,
    targetKind,
    targetId,
  }: {
    workspaceId: string;
    userId: string;
    targetKind: NotificationWatchTargetKind;
    targetId: string | null;
  }): Promise<boolean> {
    return isDefined(
      await this.findWatch({ workspaceId, userId, targetKind, targetId }),
    );
  }

  async findWatchesForUser({
    workspaceId,
    userId,
  }: {
    workspaceId: string;
    userId: string;
  }): Promise<NotificationWatchEntity[]> {
    return this.notificationWatchRepository.find({
      where: { workspaceId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  // Removes every watch a user holds in a workspace: the permission-loss hook a
  // removed member calls (P2.1 revocation semantics — a revoked member keeps no
  // subscriptions). Returns how many were dropped.
  async removeWatchesForUser({
    workspaceId,
    userId,
  }: {
    workspaceId: string;
    userId: string;
  }): Promise<number> {
    const { affected } = await this.notificationWatchRepository.delete({
      workspaceId,
      userId,
    });

    return affected ?? 0;
  }

  // The change-event producer: resolve who watches the changed target, drop
  // watchers that lost read access (permission-loss cleanup), and emit one
  // WATCHED_RECORD_CHANGED request per surviving watcher on the P8.1 seam.
  // Best-effort — a watch fan-out failure never fails the domain write.
  async notifyWatchersOfChange({
    workspaceId,
    targetKind,
    targetId,
    objectNameSingular,
    changedFieldNames,
    excludeUserIds = [],
  }: {
    workspaceId: string;
    targetKind: NotificationWatchTargetKind;
    targetId: string;
    objectNameSingular?: string | null;
    changedFieldNames?: string[];
    excludeUserIds?: string[];
  }): Promise<string[]> {
    const watchers = await this.notificationWatchRepository.find({
      where: {
        workspaceId,
        targetKind,
        ...(isDefined(targetId) ? { targetId } : {}),
      },
    });

    if (watchers.length === 0) {
      return [];
    }

    const excludedUserIdSet = new Set(excludeUserIds);
    const permittedUserIds: string[] = [];

    for (const watcher of watchers) {
      if (excludedUserIdSet.has(watcher.userId)) {
        continue;
      }

      const canRead = await this.canUserReadTarget({
        workspaceId,
        userId: watcher.userId,
        targetKind,
        targetId,
        objectNameSingular,
      });

      if (!canRead) {
        // Permission loss drops the watch, so a stale subscription cannot
        // resurface if access is later restored via a different role.
        await this.removeWatchById({ workspaceId, watchId: watcher.id });
        continue;
      }

      permittedUserIds.push(watcher.userId);
    }

    if (permittedUserIds.length === 0) {
      return [];
    }

    this.notificationService.requestNotifications({
      workspaceId,
      requests: permittedUserIds.map((userId) => ({
        userId,
        type: 'WATCHED_RECORD_CHANGED' as const,
        payload: buildWatchNotificationPayload({
          targetKind,
          objectNameSingular,
          targetId,
          changedFieldNames,
        }),
      })),
    });

    return permittedUserIds;
  }

  private async findWatch({
    workspaceId,
    userId,
    targetKind,
    targetId,
  }: {
    workspaceId: string;
    userId: string;
    targetKind: NotificationWatchTargetKind;
    targetId: string | null;
  }): Promise<NotificationWatchEntity | null> {
    return this.notificationWatchRepository.findOne({
      where: {
        workspaceId,
        userId,
        targetKind,
        ...(isDefined(targetId) ? { targetId } : {}),
      },
    });
  }

  private async removeWatchById({
    workspaceId,
    watchId,
  }: {
    workspaceId: string;
    watchId: string;
  }): Promise<void> {
    await this.notificationWatchRepository.delete({ workspaceId, id: watchId });
  }

  // Reuses the P2.1 ACL primitive with an explicit member identity, exactly as
  // the mentions engine does: a record/document watch checks read access to the
  // record, a channel watch checks channel access. A missing membership (removed
  // member) resolves to deny, which prunes the watch.
  private async canUserReadTarget({
    workspaceId,
    userId,
    targetKind,
    targetId,
    objectNameSingular,
  }: {
    workspaceId: string;
    userId: string;
    targetKind: NotificationWatchTargetKind;
    targetId: string;
    objectNameSingular?: string | null;
  }): Promise<boolean> {
    try {
      const userWorkspace =
        await this.userWorkspaceService.getUserWorkspaceForUser({
          userId,
          workspaceId,
          relations: [],
        });

      if (!isDefined(userWorkspace)) {
        return false;
      }

      const workspaceMemberId = await this.resolveWorkspaceMemberId({
        workspaceId,
        userId,
      });

      if (!isDefined(workspaceMemberId)) {
        return false;
      }

      const identity = {
        workspaceId,
        userId,
        workspaceMemberId,
        userWorkspaceId: userWorkspace.id,
      };

      if (targetKind === 'CHANNEL') {
        return this.realtimeTopicAccessService.canWorkspaceMemberReadChatChannel(
          { identity, channelId: targetId },
        );
      }

      const resolvedObjectNameSingular =
        targetKind === 'DOCUMENT' ? DOCUMENT_OBJECT_NAME : objectNameSingular;

      if (!isDefined(resolvedObjectNameSingular)) {
        return false;
      }

      return this.realtimeTopicAccessService.canWorkspaceMemberReadObjectRecord(
        {
          identity,
          objectNameSingular: resolvedObjectNameSingular,
          recordId: targetId,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to evaluate watch access for user ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );

      return false;
    }
  }

  // Membership is resolved through the workspace member cache, the same source
  // the P2.1 authorization service reads, so a removed member never resolves.
  private async resolveWorkspaceMemberId({
    workspaceId,
    userId,
  }: {
    workspaceId: string;
    userId: string;
  }): Promise<string | null> {
    const { flatWorkspaceMemberMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatWorkspaceMemberMaps',
      ]);

    return flatWorkspaceMemberMaps.idByUserId[userId] ?? null;
  }
}
