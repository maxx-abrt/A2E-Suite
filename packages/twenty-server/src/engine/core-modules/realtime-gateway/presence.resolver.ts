import { UseGuards } from '@nestjs/common';
import { Query } from '@nestjs/graphql';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { PresenceMemberDTO } from 'src/engine/core-modules/realtime-gateway/dtos/presence-member.dto';
import { PresenceService } from 'src/engine/core-modules/realtime-gateway/services/presence.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@CoreResolver()
@UseGuards(WorkspaceAuthGuard, NoPermissionGuard)
export class PresenceResolver {
  constructor(private readonly presenceService: PresenceService) {}

  @Query(() => [PresenceMemberDTO])
  async workspacePresence(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<PresenceMemberDTO[]> {
    return this.presenceService.getWorkspaceRoster(workspace.id);
  }
}
