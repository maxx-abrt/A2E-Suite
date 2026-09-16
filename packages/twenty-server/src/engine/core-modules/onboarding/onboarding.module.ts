import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationRegistrationModule } from 'src/engine/core-modules/application/application-registration/application-registration.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { ApplicationPackageModule } from 'src/engine/core-modules/application/application-package/application-package.module';
import { CacheLockModule } from 'src/engine/core-modules/cache-lock/cache-lock.module';
import { BillingModule } from 'src/engine/core-modules/billing/billing.module';
import { KeyValuePairModule } from 'src/engine/core-modules/key-value-pair/key-value-pair.module';
import { OnboardingResolver } from 'src/engine/core-modules/onboarding/onboarding.resolver';
import { OnboardingService } from 'src/engine/core-modules/onboarding/onboarding.service';
import { WorkspaceTemplateService } from 'src/engine/core-modules/onboarding/workspace-template.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserVarsModule } from 'src/engine/core-modules/user/user-vars/user-vars.module';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { WorkspaceMigrationModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration.module';
import { OnboardingInviteSuggestionsModule } from 'src/modules/onboarding-invite-suggestions/onboarding-invite-suggestions.module';

@Module({
  imports: [
    ApplicationModule,
    ApplicationPackageModule,
    ApplicationRegistrationModule,
    BillingModule,
    CacheLockModule,
    KeyValuePairModule,
    UserVarsModule,
    OnboardingInviteSuggestionsModule,
    PermissionsModule,
    WorkspaceCacheModule,
    WorkspaceMigrationModule,
    TypeOrmModule.forFeature([WorkspaceEntity, UserWorkspaceEntity]),
  ],
  exports: [OnboardingService],
  providers: [OnboardingService, OnboardingResolver, WorkspaceTemplateService],
})
export class OnboardingModule {}
