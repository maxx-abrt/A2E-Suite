import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { DataSource } from 'typeorm';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';
import { type SlowInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/slow-instance-command.interface';
import { UpgradeMigrationService } from 'src/engine/core-modules/upgrade/services/upgrade-migration.service';
import { UpgradeStatusService } from 'src/engine/core-modules/upgrade/services/upgrade-status.service';
import { excludeWorkspaceIds } from 'src/engine/core-modules/upgrade/utils/exclude-workspace-ids.util';
import { WorkspaceVersionService } from 'src/engine/workspace-manager/workspace-version/services/workspace-version.service';

type RunSingleMigrationResult =
  | { status: 'success' }
  | { status: 'already-executed' }
  | { status: 'failed'; error: unknown };

@Injectable()
export class InstanceCommandRunnerService {
  private readonly logger = new Logger(InstanceCommandRunnerService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly upgradeMigrationService: UpgradeMigrationService,
    private readonly workspaceVersionService: WorkspaceVersionService,
    private readonly upgradeStatusService: UpgradeStatusService,
  ) {}

  // workspaceIdsPastThisStep: workspaces whose cursor is already further in
  // the sequence (instance step inserted behind an applied workspace
  // segment). They get no workspace-scoped row, so their cursor does not
  // regress to this step.
  async runFastInstanceCommand({
    command,
    name,
    workspaceIdsPastThisStep = [],
  }: {
    command: FastInstanceCommand;
    name: string;
    workspaceIdsPastThisStep?: string[];
  }): Promise<RunSingleMigrationResult> {
    const executedByVersion =
      this.twentyConfigService.get('APP_VERSION') ?? 'unknown';

    const isAlreadyCompleted =
      await this.upgradeMigrationService.isLastAttemptCompleted({
        name,
        workspaceId: null,
      });

    if (isAlreadyCompleted) {
      this.logger.log(`${name} already executed, skipping`);

      return { status: 'already-executed' };
    }

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await command.up(queryRunner);

      const workspaceIds = excludeWorkspaceIds(
        await this.workspaceVersionService.getProvisionedWorkspaceIds({
          queryRunner,
        }),
        workspaceIdsPastThisStep,
      );

      await this.upgradeMigrationService.recordUpgradeMigration({
        name,
        workspaceIds,
        isInstance: true,
        status: 'completed',
        executedByVersion,
        queryRunner,
      });

      await queryRunner.commitTransaction();

      this.logger.log(`${name} executed successfully`);

      return { status: 'success' };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      const workspaceIds = excludeWorkspaceIds(
        await this.workspaceVersionService.getProvisionedWorkspaceIds(),
        workspaceIdsPastThisStep,
      );

      await this.upgradeMigrationService.recordUpgradeMigration({
        name,
        workspaceIds,
        isInstance: true,
        status: 'failed',
        executedByVersion,
        error,
      });

      this.logger.error(
        `${name} failed`,
        error instanceof Error ? error.stack : String(error),
      );

      return { status: 'failed', error };
    } finally {
      await queryRunner.release();
      await this.safeInvalidateUpgradeStatusCache();
    }
  }

  private async safeInvalidateUpgradeStatusCache(): Promise<void> {
    try {
      await this.upgradeStatusService.invalidateInstanceAndAllWorkspacesStatus();
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate upgrade-status cache: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async runSlowInstanceCommand({
    command,
    name,
    skipDataMigration,
    workspaceIdsPastThisStep = [],
  }: {
    command: SlowInstanceCommand;
    name: string;
    skipDataMigration?: boolean;
    workspaceIdsPastThisStep?: string[];
  }): Promise<RunSingleMigrationResult> {
    const isAlreadyCompleted =
      await this.upgradeMigrationService.isLastAttemptCompleted({
        name,
        workspaceId: null,
      });

    if (isAlreadyCompleted) {
      this.logger.log(`${name} already executed, skipping`);

      return { status: 'already-executed' };
    }

    if (!skipDataMigration) {
      const executedByVersion =
        this.twentyConfigService.get('APP_VERSION') ?? 'unknown';

      try {
        this.logger.log(`${name} starting data migration...`);
        await command.runDataMigration(this.dataSource);
        this.logger.log(`${name} data migration completed`);
      } catch (error) {
        const workspaceIds = excludeWorkspaceIds(
          await this.workspaceVersionService.getProvisionedWorkspaceIds(),
          workspaceIdsPastThisStep,
        );

        await this.upgradeMigrationService.recordUpgradeMigration({
          name,
          workspaceIds,
          isInstance: true,
          status: 'failed',
          executedByVersion,
          error,
        });

        this.logger.error(
          `${name} data migration failed`,
          error instanceof Error ? error.stack : String(error),
        );

        await this.safeInvalidateUpgradeStatusCache();

        return { status: 'failed', error };
      }
    }

    return this.runFastInstanceCommand({
      command,
      name,
      workspaceIdsPastThisStep,
    });
  }
}
