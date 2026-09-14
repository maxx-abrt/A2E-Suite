import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import {
  ApplyTemplateResultDTO,
  TemplatePreviewDTO,
} from 'src/engine/core-modules/onboarding/dtos/apply-template-operation-result.dto';
import {
  ApplyWorkspaceTemplateInput,
  ApplyWorkspaceTemplateOperationInput,
} from 'src/engine/core-modules/onboarding/dtos/apply-workspace-template.input';
import { InviteSuggestionDTO } from 'src/engine/core-modules/onboarding/dtos/invite-suggestion.dto';
import { OnboardingStepNavigationDTO } from 'src/engine/core-modules/onboarding/dtos/onboarding-step-navigation.dto';
import { OnboardingStepSuccessDTO } from 'src/engine/core-modules/onboarding/dtos/onboarding-step-success.dto';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import { OnboardingService } from 'src/engine/core-modules/onboarding/onboarding.service';
import { WorkspaceTemplateService } from 'src/engine/core-modules/onboarding/workspace-template.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { OnboardingInviteSuggestionsService } from 'src/modules/onboarding-invite-suggestions/services/onboarding-invite-suggestions.service';

@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@UsePipes(ResolverValidationPipe)
@UseFilters(PreventNestToAutoLogGraphqlErrorsFilter)
@MetadataResolver()
export class OnboardingResolver {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly onboardingInviteSuggestionsService: OnboardingInviteSuggestionsService,
    private readonly workspaceTemplateService: WorkspaceTemplateService,
  ) {}

  @Query(() => [InviteSuggestionDTO])
  @UseGuards(NoPermissionGuard)
  async getInviteSuggestions(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<InviteSuggestionDTO[]> {
    return this.onboardingInviteSuggestionsService.getOrComputeSuggestions({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => OnboardingStepSuccessDTO)
  @UseGuards(NoPermissionGuard)
  async skipSyncEmailOnboardingStep(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args({ name: 'isAutoSkipped', type: () => Boolean, defaultValue: false })
    isAutoSkipped: boolean,
  ): Promise<OnboardingStepSuccessDTO> {
    await this.onboardingService.skipOnboardingConnectAccountStep({
      userId: user.id,
      workspaceId: workspace.id,
      isAutoSkipped,
    });

    return { success: true };
  }

  @Mutation(() => OnboardingStepSuccessDTO)
  @UseGuards(NoPermissionGuard)
  async completeBookCallOnboardingStep(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args({ name: 'hasBookedCall', type: () => Boolean, defaultValue: false })
    hasBookedCall: boolean,
    @Args({ name: 'isAutoSkipped', type: () => Boolean, defaultValue: false })
    isAutoSkipped: boolean,
  ): Promise<OnboardingStepSuccessDTO> {
    await this.onboardingService.completeOnboardingBookCallStep({
      userId: user.id,
      workspaceId: workspace.id,
      hasBookedCall,
      isAutoSkipped,
    });

    return { success: true };
  }

  @Mutation(() => OnboardingStepSuccessDTO)
  @UseGuards(NoPermissionGuard)
  async applyWorkspaceTemplate(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args({ name: 'input', type: () => ApplyWorkspaceTemplateInput })
    input: ApplyWorkspaceTemplateInput,
  ): Promise<OnboardingStepSuccessDTO> {
    await this.workspaceTemplateService.applyWorkspaceTemplate({
      workspaceId: workspace.id,
      template: input.template,
    });

    return { success: true };
  }

  @Mutation(() => ApplyTemplateResultDTO)
  @UseGuards(NoPermissionGuard)
  async applyWorkspaceTemplateOperation(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args({
      name: 'input',
      type: () => ApplyWorkspaceTemplateOperationInput,
    })
    input: ApplyWorkspaceTemplateOperationInput,
  ): Promise<ApplyTemplateResultDTO> {
    const result =
      await this.workspaceTemplateService.applyWorkspaceTemplateOperation({
        workspaceId: workspace.id,
        idempotencyKey: input.idempotencyKey,
        template: input.template,
        templateVersion: input.templateVersion,
        deselectedOptionalAppUniversalIdentifiers:
          input.deselectedOptionalAppUniversalIdentifiers,
        sampleContentEnabled: input.sampleContentEnabled ?? false,
      });

    return result;
  }

  @Query(() => TemplatePreviewDTO)
  @UseGuards(NoPermissionGuard)
  async workspaceTemplatePreview(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args({ name: 'template', type: () => WorkspaceTemplate })
    template: WorkspaceTemplate,
  ): Promise<TemplatePreviewDTO> {
    return this.workspaceTemplateService.getWorkspaceTemplatePreview({
      workspaceId: workspace.id,
      template,
    });
  }

  @Mutation(() => OnboardingStepSuccessDTO)
  @UseGuards(NoPermissionGuard)
  async triggerInstallAppsOnboardingStep(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args({ name: 'universalIdentifiers', type: () => [String] })
    universalIdentifiers: string[],
    @Args({ name: 'isAutoSkipped', type: () => Boolean, defaultValue: false })
    isAutoSkipped: boolean,
  ): Promise<OnboardingStepSuccessDTO> {
    await this.onboardingService.triggerInstallAppsOnboardingStep({
      userId: user.id,
      workspaceId: workspace.id,
      universalIdentifiers,
      isAutoSkipped,
    });

    return { success: true };
  }

  @Mutation(() => OnboardingStepNavigationDTO)
  @UseGuards(NoPermissionGuard)
  async goBackToPreviousOnboardingStep(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<OnboardingStepNavigationDTO> {
    return this.onboardingService.goBackToPreviousOnboardingStep({
      userId: user.id,
      workspaceId: workspace.id,
    });
  }
}
