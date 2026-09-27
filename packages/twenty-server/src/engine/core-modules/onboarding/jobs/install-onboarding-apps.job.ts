import { Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import {
  INSTALL_ONBOARDING_APPS_JOB_NAME,
  type InstallOnboardingAppsJobData,
} from 'src/engine/core-modules/onboarding/jobs/install-onboarding-apps.job-constants';
import { OnboardingService } from 'src/engine/core-modules/onboarding/onboarding.service';

type OnboardingAppInstallOutcome = 'installed' | 'already-installed' | 'failed';

@Processor(MessageQueue.workspaceQueue)
export class InstallOnboardingAppsJob {
  private readonly logger = new Logger(InstallOnboardingAppsJob.name);

  constructor(
    private readonly applicationRegistrationService: ApplicationRegistrationService,
    private readonly applicationInstallService: ApplicationInstallService,
    private readonly onboardingService: OnboardingService,
  ) {}

  @Process(INSTALL_ONBOARDING_APPS_JOB_NAME)
  async handle({
    workspaceId,
    universalIdentifiers,
    userId,
  }: InstallOnboardingAppsJobData): Promise<void> {
    let installedAppsCount = 0;
    let alreadyInstalledAppsCount = 0;

    for (const universalIdentifier of universalIdentifiers) {
      const outcome = await this.installApp({
        universalIdentifier,
        workspaceId,
      });

      if (outcome === 'installed') {
        installedAppsCount += 1;
      }

      if (outcome === 'already-installed') {
        alreadyInstalledAppsCount += 1;
      }
    }

    if (installedAppsCount === 0 && alreadyInstalledAppsCount === 0) {
      return;
    }

    // Only apps this step actually installed earn the reward; an app that was
    // already there (e.g. a bundled A2E app pre-installed on every workspace)
    // still satisfies the user's selection, so the step history is cleared.
    if (installedAppsCount > 0) {
      await this.onboardingService.creditInstallAppsReward({
        workspaceId,
        rewardAppsCount: installedAppsCount,
      });
    }

    if (isDefined(userId)) {
      await this.onboardingService.clearReversibleOnboardingStepHistoryAfterAppsInstalled(
        { userId, workspaceId },
      );
    }
  }

  private async installApp({
    universalIdentifier,
    workspaceId,
  }: {
    universalIdentifier: string;
    workspaceId: string;
  }): Promise<OnboardingAppInstallOutcome> {
    try {
      const registration =
        await this.applicationRegistrationService.findOneByUniversalIdentifierGlobal(
          universalIdentifier,
        );

      if (!isDefined(registration)) {
        this.logger.error(
          `Onboarding app ${universalIdentifier} not found while installing for workspace ${workspaceId}`,
        );

        return 'failed';
      }

      await this.applicationInstallService.installApplication({
        appRegistrationId: registration.id,
        workspaceId,
      });

      return 'installed';
    } catch (error) {
      if (
        error instanceof ApplicationException &&
        error.code === ApplicationExceptionCode.APP_ALREADY_INSTALLED
      ) {
        this.logger.log(
          `Onboarding app ${universalIdentifier} already installed on workspace ${workspaceId}, skipping`,
        );

        return 'already-installed';
      }

      this.logger.error(
        `Failed to install onboarding app ${universalIdentifier} for workspace ${workspaceId}`,
        error,
      );

      return 'failed';
    }
  }
}
