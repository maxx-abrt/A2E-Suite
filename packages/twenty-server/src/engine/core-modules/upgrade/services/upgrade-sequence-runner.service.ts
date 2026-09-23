import { Injectable, Logger } from '@nestjs/common';

import { CommandShutdownService } from 'src/database/commands/command-runners/command-shutdown.service';
import {
  type WorkspaceIteratorReport,
  WorkspaceIteratorService,
} from 'src/database/commands/command-runners/workspace-iterator.service';
import { type ParsedUpgradeCommandOptions } from 'src/database/commands/upgrade-version-command/upgrade.command';
import { InstanceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/instance-command-runner.service';
import {
  UpgradeMigrationService,
  WorkspaceLastAttemptedCommand,
} from 'src/engine/core-modules/upgrade/services/upgrade-migration.service';
import {
  type InstanceUpgradeStep,
  type UpgradeStep,
  type WorkspaceUpgradeStep,
  UpgradeSequenceReaderService,
} from 'src/engine/core-modules/upgrade/services/upgrade-sequence-reader.service';
import { WorkspaceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/workspace-command-runner.service';
import { formatUpgradeLog } from 'src/engine/core-modules/upgrade/utils/format-upgrade-log.util';
import { isUpgradeWorkspaceCursorValidForSegment } from 'src/engine/core-modules/upgrade/utils/is-upgrade-workspace-cursor-valid-for-segment.util';
import { UpgradeAwareEntityMetadataAdapter } from 'src/engine/twenty-orm/upgrade-aware/upgrade-aware-entity-metadata.adapter';
import { WorkspaceVersionService } from 'src/engine/workspace-manager/workspace-version/services/workspace-version.service';
import { assertUnreachable, isDefined } from 'twenty-shared/utils';

export type UpgradeSequenceRunnerReport = {
  totalSuccesses: number;
  totalFailures: number;
};

@Injectable()
export class UpgradeSequenceRunnerService {
  private readonly logger = new Logger(UpgradeSequenceRunnerService.name);

  constructor(
    private readonly upgradeMigrationService: UpgradeMigrationService,
    private readonly instanceCommandRunnerService: InstanceCommandRunnerService,
    private readonly workspaceCommandRunnerService: WorkspaceCommandRunnerService,
    private readonly upgradeSequenceReaderService: UpgradeSequenceReaderService,
    private readonly upgradeAwareEntityMetadataAdapter: UpgradeAwareEntityMetadataAdapter,
    private readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly workspaceVersionService: WorkspaceVersionService,
    private readonly commandShutdownService: CommandShutdownService,
  ) {}

  async run({
    sequence,
    options,
  }: {
    sequence: UpgradeStep[];
    options: ParsedUpgradeCommandOptions;
  }): Promise<UpgradeSequenceRunnerReport> {
    if (sequence.length === 0) {
      return { totalSuccesses: 0, totalFailures: 0 };
    }

    await this.upgradeAwareEntityMetadataAdapter.refresh();

    try {
      return await this.runInner({ sequence, options });
    } finally {
      try {
        await this.upgradeAwareEntityMetadataAdapter.refresh();
      } catch (refreshError) {
        this.logger.error(
          `Failed to refresh upgrade-aware entity metadata after run`,
          refreshError instanceof Error
            ? refreshError.stack
            : String(refreshError),
        );
      }
    }
  }

  private async runInner({
    sequence,
    options,
  }: {
    sequence: UpgradeStep[];
    options: ParsedUpgradeCommandOptions;
  }): Promise<UpgradeSequenceRunnerReport> {
    const allProvisionedWorkspaceIds =
      await this.workspaceVersionService.getProvisionedWorkspaceIds();

    const startCursor = await this.resolveStartCursor({
      sequence,
      allProvisionedWorkspaceIds,
    });

    let totalSuccesses = 0;
    let totalFailures = 0;
    let cursor = startCursor;
    let workspaceCursors = await this.fetchWorkspaceCursors(
      allProvisionedWorkspaceIds,
    );

    while (cursor < sequence.length) {
      const step = sequence[cursor];

      if (this.commandShutdownService.isShutdownRequested()) {
        this.logger.warn(
          formatUpgradeLog({
            humanMessage:
              `Stopping before step "${step.name}": shutdown requested. ` +
              'Rerun the upgrade to resume from this step.',
            event: 'sequence.stopped',
            logFields: {
              before: step.name,
              reason: 'shutdown-requested',
            },
          }),
        );

        break;
      }

      if (step.kind === 'fast-instance' || step.kind === 'slow-instance') {
        if (
          (isDefined(options.workspaceIds) &&
            options.workspaceIds.length > 0) ||
          isDefined(options.startFromWorkspaceId) ||
          isDefined(options.workspaceCountLimit)
        ) {
          this.logger.log(
            formatUpgradeLog({
              humanMessage:
                `Stopping before instance step "${step.name}": ` +
                'upgrade was run with a workspace filter (-w, --start-from-workspace-id, or --workspace-count-limit). ' +
                'Instance commands require all workspaces to be aligned.',
              event: 'sequence.stopped',
              logFields: {
                before: step.name,
                reason: 'workspace-filter-active',
              },
            }),
          );

          break;
        }

        const previousStep = cursor > 0 ? sequence[cursor - 1] : undefined;

        if (previousStep?.kind === 'workspace') {
          this.enforceWorkspacesCompletedPreviousWorkspaceSegment({
            sequence,
            previousWorkspaceStep: previousStep,
            workspaceCursors,
          });
        }

        await this.runInstanceStep({
          instanceStep: step,
          skipDataMigration: allProvisionedWorkspaceIds.length === 0,
          workspaceIdsPastThisStep: this.findWorkspaceIdsPastStep({
            sequence,
            stepCursor: cursor,
            workspaceCursors,
          }),
        });

        await this.upgradeAwareEntityMetadataAdapter.refresh();

        cursor++;
        continue;
      }

      const workspaceCommandsSegment =
        this.upgradeSequenceReaderService.collectWorkspaceCommandsStartingFrom({
          sequence,
          fromWorkspaceCommand: step,
        });

      const report = await this.resumeWorkspaceCommandsFromCursors({
        workspaceCommandsSegment,
        workspaceCursors,
        allProvisionedWorkspaceIds,
        options,
      });

      totalSuccesses += report.success.length;
      totalFailures += report.fail.length;

      if (report.fail.length > 0) {
        this.logger.error(
          formatUpgradeLog({
            humanMessage:
              `Workspace steps ended with ${report.fail.length} failure(s). ` +
              'Aborting — cannot proceed to next instance step.',
            event: 'sequence.aborted',
            logFields: {
              failures: report.fail.length,
              reason: 'workspace-failures',
            },
          }),
        );

        return { totalSuccesses, totalFailures };
      }

      if (report.interrupted) {
        this.logger.warn(
          formatUpgradeLog({
            humanMessage:
              'Stopped during workspace steps: shutdown requested. ' +
              'Rerun the upgrade to process the remaining workspaces.',
            event: 'sequence.stopped',
            logFields: {
              reason: 'shutdown-requested',
              processedWorkspaces: report.success.length,
            },
          }),
        );

        return { totalSuccesses, totalFailures };
      }

      cursor += workspaceCommandsSegment.length;

      workspaceCursors = await this.fetchWorkspaceCursors(
        allProvisionedWorkspaceIds,
      );
    }

    return { totalSuccesses, totalFailures };
  }

  private async resolveStartCursor({
    sequence,
    allProvisionedWorkspaceIds,
  }: {
    sequence: UpgradeStep[];
    allProvisionedWorkspaceIds: string[];
  }): Promise<number> {
    const lastAttempted =
      await this.upgradeMigrationService.getLastAttemptedCommandNameOrThrow(
        allProvisionedWorkspaceIds,
      );

    const lastAttemptedCursor =
      this.upgradeSequenceReaderService.locateStepInSequenceOrThrow({
        sequence,
        stepName: lastAttempted.name,
      });

    const lastAttemptedStep = sequence[lastAttemptedCursor];

    switch (lastAttemptedStep.kind) {
      case 'fast-instance':
      case 'slow-instance': {
        return lastAttempted.status === 'completed'
          ? lastAttemptedCursor + 1
          : lastAttemptedCursor;
      }
      case 'workspace': {
        const workspaceSliceBounds =
          this.upgradeSequenceReaderService.getWorkspaceSegmentBounds({
            sequence,
            workspaceCommand: lastAttemptedStep,
          });

        await this.validateWorkspaceCursorsAreInWorkspaceSegment({
          sequence,
          allProvisionedWorkspaceIds,
          workspaceSliceBounds,
        });

        return this.resolveWorkspaceSegmentResumeCursor({
          sequence,
          workspaceSegmentStartCursor: workspaceSliceBounds.startCursor,
        });
      }
      default:
        assertUnreachable(lastAttemptedStep);
    }
  }

  // An instance command added to an already-shipped version can sit in the
  // instance block right before a workspace segment the workspaces have
  // already applied. Resuming at the segment start would never visit it, so
  // resume at the first instance command of that block the instance cursor
  // has not reached yet; the loop then walks into the segment as usual.
  private async resolveWorkspaceSegmentResumeCursor({
    sequence,
    workspaceSegmentStartCursor,
  }: {
    sequence: UpgradeStep[];
    workspaceSegmentStartCursor: number;
  }): Promise<number> {
    let instanceBlockStartCursor = workspaceSegmentStartCursor;

    while (
      instanceBlockStartCursor > 0 &&
      sequence[instanceBlockStartCursor - 1].kind !== 'workspace'
    ) {
      instanceBlockStartCursor--;
    }

    if (instanceBlockStartCursor === workspaceSegmentStartCursor) {
      return workspaceSegmentStartCursor;
    }

    const lastAttemptedInstanceCommand =
      await this.upgradeMigrationService.getLastAttemptedInstanceCommand();

    if (!isDefined(lastAttemptedInstanceCommand)) {
      return workspaceSegmentStartCursor;
    }

    const lastAttemptedInstanceCursor = sequence.findIndex(
      (step) => step.name === lastAttemptedInstanceCommand.name,
    );

    if (
      lastAttemptedInstanceCursor === -1 ||
      lastAttemptedInstanceCursor >= workspaceSegmentStartCursor
    ) {
      return workspaceSegmentStartCursor;
    }

    if (lastAttemptedInstanceCursor < instanceBlockStartCursor) {
      this.logInsertedInstanceCommandResume({
        sequence,
        resumeCursor: instanceBlockStartCursor,
      });

      return instanceBlockStartCursor;
    }

    const resumeCursor =
      lastAttemptedInstanceCommand.status === 'completed'
        ? lastAttemptedInstanceCursor + 1
        : lastAttemptedInstanceCursor;

    if (resumeCursor < workspaceSegmentStartCursor) {
      this.logInsertedInstanceCommandResume({ sequence, resumeCursor });
    }

    return resumeCursor;
  }

  private logInsertedInstanceCommandResume({
    sequence,
    resumeCursor,
  }: {
    sequence: UpgradeStep[];
    resumeCursor: number;
  }): void {
    const resumeStep = sequence[resumeCursor];

    this.logger.log(
      formatUpgradeLog({
        humanMessage:
          `Resuming at instance step "${resumeStep.name}": it was added ` +
          'before a workspace segment the workspaces have already applied.',
        event: 'sequence.resumed-at-inserted-instance-step',
        logFields: {
          step: resumeStep.name,
        },
      }),
    );
  }

  // Workspaces whose cursor is already further in the sequence than an
  // instance step (only possible when that step was inserted behind an
  // applied workspace segment) must not get a workspace-scoped row for it:
  // that row would become their newest cursor and re-queue the segment.
  private findWorkspaceIdsPastStep({
    sequence,
    stepCursor,
    workspaceCursors,
  }: {
    sequence: UpgradeStep[];
    stepCursor: number;
    workspaceCursors: Map<string, WorkspaceLastAttemptedCommand>;
  }): string[] {
    const workspaceIdsPastStep: string[] = [];

    for (const [workspaceId, workspaceCursor] of workspaceCursors) {
      const cursorPosition = sequence.findIndex(
        (step) => step.name === workspaceCursor.name,
      );

      if (cursorPosition > stepCursor) {
        workspaceIdsPastStep.push(workspaceId);
      }
    }

    return workspaceIdsPastStep;
  }

  private async validateWorkspaceCursorsAreInWorkspaceSegment({
    allProvisionedWorkspaceIds,
    sequence,
    workspaceSliceBounds: { startCursor, endCursor },
  }: {
    sequence: UpgradeStep[];
    allProvisionedWorkspaceIds: string[];
    workspaceSliceBounds: { startCursor: number; endCursor: number };
  }): Promise<void> {
    const workspaceCursors =
      await this.upgradeMigrationService.getWorkspaceLastAttemptedCommandNameOrThrow(
        allProvisionedWorkspaceIds,
      );
    const invalidWorkspaces: Array<{
      workspaceId: string;
      cursorName: string;
      cursorStatus: string;
    }> = [];

    for (const [workspaceId, workspaceCursor] of workspaceCursors) {
      const cursorPosition =
        this.upgradeSequenceReaderService.locateStepInSequenceOrThrow({
          sequence,
          stepName: workspaceCursor.name,
        });

      const isWorkspaceCursorValid = isUpgradeWorkspaceCursorValidForSegment({
        sequence,
        cursorPosition,
        workspaceCursorStatus: workspaceCursor.status,
        startCursor,
        endCursor,
      });

      if (!isWorkspaceCursorValid) {
        invalidWorkspaces.push({
          workspaceId,
          cursorName: workspaceCursor.name,
          cursorStatus: workspaceCursor.status,
        });
      }
    }

    if (invalidWorkspaces.length > 0) {
      const details = invalidWorkspaces
        .map(
          ({ workspaceId, cursorName, cursorStatus }) =>
            `${workspaceId} at "${cursorName}" (${cursorStatus})`,
        )
        .join(', ');

      throw new Error(
        `${invalidWorkspaces.length} workspace(s) have invalid cursors for ` +
          `workspace segment [${startCursor}..${endCursor}]: ${details}`,
      );
    }
  }

  private async fetchWorkspaceCursors(
    allProvisionedWorkspaceIds: string[],
  ): Promise<Map<string, WorkspaceLastAttemptedCommand>> {
    return this.upgradeMigrationService.getWorkspaceLastAttemptedCommandNameOrThrow(
      allProvisionedWorkspaceIds,
    );
  }

  private async runInstanceStep({
    instanceStep,
    skipDataMigration,
    workspaceIdsPastThisStep,
  }: {
    instanceStep: InstanceUpgradeStep;
    skipDataMigration: boolean;
    workspaceIdsPastThisStep: string[];
  }): Promise<void> {
    switch (instanceStep.kind) {
      case 'fast-instance': {
        const result =
          await this.instanceCommandRunnerService.runFastInstanceCommand({
            command: instanceStep.command,
            name: instanceStep.name,
            workspaceIdsPastThisStep,
          });

        if (result.status === 'failed') {
          throw result.error;
        }

        return;
      }
      case 'slow-instance': {
        const result =
          await this.instanceCommandRunnerService.runSlowInstanceCommand({
            command: instanceStep.command,
            name: instanceStep.name,
            skipDataMigration,
            workspaceIdsPastThisStep,
          });

        if (result.status === 'failed') {
          throw result.error;
        }

        return;
      }
      default:
        assertUnreachable(instanceStep);
    }
  }

  private async resumeWorkspaceCommandsFromCursors({
    workspaceCommandsSegment,
    workspaceCursors,
    allProvisionedWorkspaceIds,
    options,
  }: {
    workspaceCommandsSegment: WorkspaceUpgradeStep[];
    workspaceCursors: Map<string, WorkspaceLastAttemptedCommand>;
    allProvisionedWorkspaceIds: string[];
    options: ParsedUpgradeCommandOptions;
  }): Promise<WorkspaceIteratorReport> {
    const workspaceIds = this.deriveWorkspaceIdsToProcess({
      allProvisionedWorkspaceIds,
      options,
    });

    return this.workspaceIteratorService.iterate({
      workspaceIds,
      dryRun: options.dryRun,
      callback: async (context) => {
        const workspaceCursor = workspaceCursors.get(context.workspaceId);

        if (!workspaceCursor) {
          throw new Error(
            `No upgrade migration found for workspace ${context.workspaceId}. This should never occur.`,
          );
        }

        const pendingCommands =
          this.upgradeSequenceReaderService.getPendingWorkspaceCommands({
            workspaceCommands: workspaceCommandsSegment,
            workspaceCursor,
          });

        await this.workspaceCommandRunnerService.runWorkspaceCommands({
          iteratorContext: context,
          options,
          workspaceCommands: pendingCommands,
        });
      },
    });
  }

  private deriveWorkspaceIdsToProcess({
    allProvisionedWorkspaceIds,
    options,
  }: {
    allProvisionedWorkspaceIds: string[];
    options: ParsedUpgradeCommandOptions;
  }): string[] {
    if (isDefined(options.workspaceIds) && options.workspaceIds.length > 0) {
      return options.workspaceIds;
    }

    let workspaceIds = allProvisionedWorkspaceIds;

    if (isDefined(options.startFromWorkspaceId)) {
      workspaceIds = workspaceIds.filter(
        (id) => id >= options.startFromWorkspaceId!,
      );
    }

    if (isDefined(options.workspaceCountLimit)) {
      workspaceIds = workspaceIds.slice(0, options.workspaceCountLimit);
    }

    return workspaceIds;
  }

  private enforceWorkspacesCompletedPreviousWorkspaceSegment({
    sequence,
    previousWorkspaceStep,
    workspaceCursors,
  }: {
    sequence: UpgradeStep[];
    previousWorkspaceStep: WorkspaceUpgradeStep;
    workspaceCursors: Map<string, WorkspaceLastAttemptedCommand>;
  }): void {
    const barrierCursor =
      this.upgradeSequenceReaderService.locateStepInSequenceOrThrow({
        sequence,
        stepName: previousWorkspaceStep.name,
      });

    for (const [workspaceId, workspaceCursor] of workspaceCursors) {
      const cursorPosition =
        this.upgradeSequenceReaderService.locateStepInSequenceOrThrow({
          sequence,
          stepName: workspaceCursor.name,
        });

      const isAtBarrierAndCompleted =
        cursorPosition === barrierCursor &&
        workspaceCursor.status === 'completed';

      // A cursor beyond the barrier (a retried instance step, or an instance
      // step inserted behind an applied segment) has completed the segment.
      const isPastBarrier = cursorPosition > barrierCursor;

      if (!isAtBarrierAndCompleted && !isPastBarrier) {
        throw new Error(
          `Cannot run instance step: workspace ${workspaceId} ` +
            `has not completed "${previousWorkspaceStep.name}" ` +
            `(cursor: "${workspaceCursor.name}", status: "${workspaceCursor.status}")`,
        );
      }
    }
  }
}
