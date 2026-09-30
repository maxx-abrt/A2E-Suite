import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { type TestWorkspaceAiProviderInput } from 'src/engine/metadata-modules/ai/ai-models/dtos/test-workspace-ai-provider.input';
import { type UpsertWorkspaceAiProviderInput } from 'src/engine/metadata-modules/ai/ai-models/dtos/upsert-workspace-ai-provider.input';
import { WorkspaceAiProvidersDTO } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider.dto';
import { WorkspaceAiProviderTestResultDTO } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider-test-result.dto';
import { WorkspaceAiProviderAdminService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider-admin.service';
import { WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';
import { AiGraphqlApiExceptionInterceptor } from 'src/engine/metadata-modules/ai/interceptors/ai-graphql-api-exception.interceptor';

// Every field is key-safe by construction: reads project presence + fixed mask
// only, and the test mutation returns a classified result, never provider text.
@UseGuards(
  WorkspaceAuthGuard,
  SettingsPermissionGuard(PermissionFlagType.AI_SETTINGS),
)
@UseInterceptors(AiGraphqlApiExceptionInterceptor)
@MetadataResolver()
export class WorkspaceAiProviderResolver {
  constructor(
    private readonly workspaceAiProviderAdminService: WorkspaceAiProviderAdminService,
    private readonly workspaceAiProviderService: WorkspaceAiProviderService,
  ) {}

  @Query(() => WorkspaceAiProvidersDTO)
  async workspaceAiProviders(
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<WorkspaceAiProvidersDTO> {
    return this.workspaceAiProviderAdminService.getProvidersOverview(
      workspaceId,
    );
  }

  @Mutation(() => WorkspaceAiProvidersDTO)
  async upsertWorkspaceAiProvider(
    @Args('input') input: UpsertWorkspaceAiProviderInput,
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<WorkspaceAiProvidersDTO> {
    await this.workspaceAiProviderService.upsertProvider({
      workspaceId,
      ...input,
    });

    return this.workspaceAiProviderAdminService.getProvidersOverview(
      workspaceId,
    );
  }

  @Mutation(() => WorkspaceAiProviderTestResultDTO)
  async testWorkspaceAiProvider(
    @Args('input') input: TestWorkspaceAiProviderInput,
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<WorkspaceAiProviderTestResultDTO> {
    return this.workspaceAiProviderAdminService.testProvider({
      workspaceId,
      input,
    });
  }

  @Mutation(() => WorkspaceAiProvidersDTO)
  async removeWorkspaceAiProvider(
    @Args('provider') provider: string,
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<WorkspaceAiProvidersDTO> {
    await this.workspaceAiProviderService.removeProvider({
      workspaceId,
      provider,
    });

    return this.workspaceAiProviderAdminService.getProvidersOverview(
      workspaceId,
    );
  }
}
