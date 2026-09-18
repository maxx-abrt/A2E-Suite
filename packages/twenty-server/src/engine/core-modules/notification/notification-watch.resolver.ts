import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { NotificationWatchDTO } from 'src/engine/core-modules/notification/dtos/notification-watch.dto';
import { NotificationWatchService } from 'src/engine/core-modules/notification/services/notification-watch.service';
import { type NotificationWatchTargetKind } from 'src/engine/core-modules/notification/constants/notification-watch-target-kind.constant';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

// Without @CoreResolver the class never registers on the core `/graphql` schema
// (notification/document-share precedent). Every operation is caller-scoped:
// workspace and user come from the session, never from args, so a member can
// only manage their own watches.
@CoreResolver()
@UsePipes(ResolverValidationPipe)
@UseFilters(PreventNestToAutoLogGraphqlErrorsFilter)
export class NotificationWatchResolver {
  constructor(
    private readonly notificationWatchService: NotificationWatchService,
  ) {}

  @Query(() => [NotificationWatchDTO])
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard, NoPermissionGuard)
  async notificationWatches(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<NotificationWatchDTO[]> {
    const watches = await this.notificationWatchService.findWatchesForUser({
      workspaceId: workspace.id,
      userId: user.id,
    });

    return watches.map((watch) => ({
      id: watch.id,
      targetKind: watch.targetKind,
      targetId: watch.targetId,
    }));
  }

  @Mutation(() => Boolean)
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard, NoPermissionGuard)
  async watchNotificationTarget(
    @Args('targetKind', { type: () => String })
    targetKind: NotificationWatchTargetKind,
    @Args('targetId', { type: () => UUIDScalarType, nullable: true })
    targetId: string | null,
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<boolean> {
    await this.notificationWatchService.watch({
      workspaceId: workspace.id,
      userId: user.id,
      targetKind,
      targetId,
    });

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard, NoPermissionGuard)
  async unwatchNotificationTarget(
    @Args('targetKind', { type: () => String })
    targetKind: NotificationWatchTargetKind,
    @Args('targetId', { type: () => UUIDScalarType, nullable: true })
    targetId: string | null,
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<boolean> {
    return this.notificationWatchService.unwatch({
      workspaceId: workspace.id,
      userId: user.id,
      targetKind,
      targetId,
    });
  }
}
