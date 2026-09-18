import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Int, Mutation, Query } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { NotificationDTO } from 'src/engine/core-modules/notification/dtos/notification.dto';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { toNotificationDTO } from 'src/engine/core-modules/notification/utils/notification-to-dto.util';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

// Without @CoreResolver the class never registers on the core `/graphql` schema
// and every inbox endpoint silently 404s at the schema level (document-share
// precedent).
@CoreResolver()
@UsePipes(ResolverValidationPipe)
@UseFilters(PreventNestToAutoLogGraphqlErrorsFilter)
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  // The inbox is always read as the caller: workspace and user scope come from
  // the session, never from args, so one member can never read another's inbox.
  @Query(() => [NotificationDTO])
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard, NoPermissionGuard)
  async notifications(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('includeArchived', {
      type: () => Boolean,
      nullable: true,
      defaultValue: false,
    })
    includeArchived: boolean,
  ): Promise<NotificationDTO[]> {
    const notifications = await this.notificationService.findForUser({
      workspaceId: workspace.id,
      userId: user.id,
      includeArchived,
    });

    return notifications.map(toNotificationDTO);
  }

  @Query(() => Int)
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard, NoPermissionGuard)
  async notificationUnreadCount(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<number> {
    return this.notificationService.countUnread({
      workspaceId: workspace.id,
      userId: user.id,
    });
  }

  // Bulk actions land on one mutation each: the inbox selects N rows and marks
  // or archives them in a single request.
  @Mutation(() => Int)
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard, NoPermissionGuard)
  async markNotificationsAsRead(
    @Args('notificationIds', { type: () => [UUIDScalarType] })
    notificationIds: string[],
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<number> {
    return this.notificationService.markAsRead({
      workspaceId: workspace.id,
      userId: user.id,
      notificationIds,
    });
  }

  @Mutation(() => Int)
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard, NoPermissionGuard)
  async archiveNotifications(
    @Args('notificationIds', { type: () => [UUIDScalarType] })
    notificationIds: string[],
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<number> {
    return this.notificationService.archiveNotifications({
      workspaceId: workspace.id,
      userId: user.id,
      notificationIds,
    });
  }
}
