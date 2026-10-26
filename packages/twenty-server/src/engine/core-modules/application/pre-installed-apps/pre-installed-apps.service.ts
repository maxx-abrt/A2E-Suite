import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import {
  INSTALL_PRE_INSTALLED_APPS_JOB_NAME,
  type InstallPreInstalledAppsJobData,
} from 'src/engine/core-modules/application/pre-installed-apps/jobs/install-pre-installed-apps.job-constants';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';

type PreInstalledAppsOptions = {
  shouldDeferPostInstall?: boolean;
};

@Injectable()
export class PreInstalledAppsService {
  private readonly logger = new Logger(PreInstalledAppsService.name);

  constructor(
    private readonly applicationInstallService: ApplicationInstallService,
    @InjectRepository(ApplicationRegistrationEntity)
    private readonly applicationRegistrationRepository: Repository<ApplicationRegistrationEntity>,
    private readonly workspaceIteratorService: WorkspaceIteratorService,
    @InjectMessageQueue(MessageQueue.workspaceQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async enqueueInstallOnWorkspace(workspaceId: string): Promise<void> {
    await this.messageQueueService.add<InstallPreInstalledAppsJobData>(
      INSTALL_PRE_INSTALLED_APPS_JOB_NAME,
      { workspaceId },
      { id: `${INSTALL_PRE_INSTALLED_APPS_JOB_NAME}-${workspaceId}` },
    );
  }

  // Per-app failures are logged but never block the other installs —
  // `ApplicationInstallService` holds a per-app cache lock so parallel
  // installs are safe. Apps can relate to objects owned by other apps
  // (projects → documents, chat → projects) and registrations carry no
  // dependency graph, so installs run in passes: each pass retries what
  // failed in the previous one for as long as that pass made progress.
  async installOnWorkspace(
    workspaceId: string,
    options: PreInstalledAppsOptions = {},
  ): Promise<void> {
    const registrations = await this.applicationRegistrationRepository.find({
      where: { isPreInstalled: true },
    });

    let pendingRegistrations = registrations;

    while (pendingRegistrations.length > 0) {
      const outcomes = await Promise.all(
        pendingRegistrations.map(async (registration) => ({
          registration,
          failure: await this.tryInstallRegistration(
            registration,
            workspaceId,
            options,
          ),
        })),
      );

      const failedOutcomes = outcomes.filter(
        (outcome) => outcome.failure !== null,
      );
      const madeProgress = failedOutcomes.length < pendingRegistrations.length;

      if (failedOutcomes.length === 0 || !madeProgress) {
        for (const { registration, failure } of failedOutcomes) {
          this.logger.error(
            `Failed to install pre-installed app "${registration.name}" (${registration.id}) on workspace ${workspaceId}: ${failure}`,
          );
        }

        if (failedOutcomes.length > 0) {
          throw new Error(
            `Failed to install ${failedOutcomes.length} pre-installed app(s) on workspace ${workspaceId}`,
          );
        }

        return;
      }

      this.logger.log(
        `Retrying ${failedOutcomes.length} pre-installed app(s) on workspace ${workspaceId} after their dependencies were installed`,
      );

      pendingRegistrations = failedOutcomes.map(
        (outcome) => outcome.registration,
      );
    }
  }

  // Resolves to null when the app is installed (or already was), otherwise to
  // the failure message so the caller can decide whether to retry.
  private async tryInstallRegistration(
    registration: ApplicationRegistrationEntity,
    workspaceId: string,
    options: PreInstalledAppsOptions,
  ): Promise<string | null> {
    try {
      await this.applicationInstallService.installApplication({
        appRegistrationId: registration.id,
        workspaceId,
        ...(options.shouldDeferPostInstall === true
          ? { shouldDeferPostInstall: true }
          : {}),
      });

      return null;
    } catch (error) {
      // APP_ALREADY_INSTALLED is not a failure — it means the app was
      // previously installed (e.g. from an earlier boot).
      if (
        error instanceof ApplicationException &&
        error.code === ApplicationExceptionCode.APP_ALREADY_INSTALLED
      ) {
        this.logger.log(
          `Pre-installed app "${registration.name}" already installed on workspace ${workspaceId}, skipping`,
        );

        return null;
      }

      return error instanceof Error ? error.message : String(error);
    }
  }

  async backfillApplicationOnAllWorkspaces(
    applicationRegistrationId: string,
  ): Promise<void> {
    const registration = await this.applicationRegistrationRepository.findOne({
      where: { id: applicationRegistrationId, isPreInstalled: true },
    });

    if (!registration) {
      throw new ApplicationException(
        `Pre-installed application registration with id ${applicationRegistrationId} not found`,
        ApplicationExceptionCode.APPLICATION_NOT_FOUND,
      );
    }

    const report = await this.workspaceIteratorService.iterate({
      callback: async ({ workspaceId }) => {
        try {
          await this.applicationInstallService.installApplication({
            appRegistrationId: registration.id,
            workspaceId,
          });
        } catch (error) {
          if (
            error instanceof ApplicationException &&
            error.code === ApplicationExceptionCode.APP_ALREADY_INSTALLED
          ) {
            return;
          }

          throw error;
        }
      },
    });

    this.logger.log(
      `Backfilled app "${registration.name}" (${registration.id}): ${report.success.length} succeeded, ${report.fail.length} failed`,
    );
  }
}
