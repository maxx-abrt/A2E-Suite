import { type CommandShutdownService } from 'src/database/commands/command-runners/command-shutdown.service';
import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type ParsedUpgradeCommandOptions } from 'src/database/commands/upgrade-version-command/upgrade.command';
import { type InstanceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/instance-command-runner.service';
import {
  type UpgradeMigrationService,
  type WorkspaceLastAttemptedCommand,
} from 'src/engine/core-modules/upgrade/services/upgrade-migration.service';
import {
  type UpgradeStep,
  UpgradeSequenceReaderService,
} from 'src/engine/core-modules/upgrade/services/upgrade-sequence-reader.service';
import { UpgradeSequenceRunnerService } from 'src/engine/core-modules/upgrade/services/upgrade-sequence-runner.service';
import { type WorkspaceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/workspace-command-runner.service';
import { type UpgradeMigrationStatus } from 'src/engine/core-modules/upgrade/upgrade-migration.entity';
import { type UpgradeAwareEntityMetadataAdapter } from 'src/engine/twenty-orm/upgrade-aware/upgrade-aware-entity-metadata.adapter';
import { type WorkspaceVersionService } from 'src/engine/workspace-manager/workspace-version/services/workspace-version.service';

const WS_1 = 'workspace-1';
const WS_2 = 'workspace-2';

const DEFAULT_OPTIONS = {
  workspaceIds: undefined,
  startFromWorkspaceId: undefined,
  workspaceCountLimit: undefined,
  dryRun: false,
  verbose: false,
} as unknown as ParsedUpgradeCommandOptions;

const noopAsync = async () => {};

const makeStep = (kind: UpgradeStep['kind'], name: string): UpgradeStep =>
  ({
    kind,
    name,
    command:
      kind === 'workspace'
        ? { runOnWorkspace: noopAsync }
        : { up: noopAsync, down: noopAsync, runDataMigration: noopAsync },
    version: '2.39.0',
    timestamp: 0,
  }) as unknown as UpgradeStep;

const makeCursor = (
  workspaceId: string,
  name: string,
  status: UpgradeMigrationStatus = 'completed',
): WorkspaceLastAttemptedCommand => ({
  workspaceId,
  name,
  status,
  executedByVersion: '2.39.0',
  errorMessage: null,
  createdAt: new Date(),
  isInitial: false,
});

type RunnerScenario = {
  lastAttempted: { name: string; status: UpgradeMigrationStatus };
  lastAttemptedInstanceCommand: {
    name: string;
    status: UpgradeMigrationStatus;
  } | null;
  workspaceCursors: WorkspaceLastAttemptedCommand[];
};

const buildRunner = ({
  lastAttempted,
  lastAttemptedInstanceCommand,
  workspaceCursors,
}: RunnerScenario) => {
  const upgradeMigrationService = {
    getLastAttemptedCommandNameOrThrow: jest
      .fn()
      .mockResolvedValue(lastAttempted),
    getLastAttemptedInstanceCommand: jest.fn().mockResolvedValue(
      lastAttemptedInstanceCommand === null
        ? null
        : {
            ...lastAttemptedInstanceCommand,
            executedByVersion: '2.39.0',
            errorMessage: null,
            createdAt: new Date(),
          },
    ),
    getWorkspaceLastAttemptedCommandNameOrThrow: jest
      .fn()
      .mockImplementation(
        async () =>
          new Map(
            workspaceCursors.map((cursor) => [cursor.workspaceId, cursor]),
          ),
      ),
  };

  const instanceCommandRunnerService = {
    runFastInstanceCommand: jest.fn().mockResolvedValue({ status: 'success' }),
    runSlowInstanceCommand: jest.fn().mockResolvedValue({ status: 'success' }),
  };

  const workspaceCommandRunnerService = {
    runWorkspaceCommands: jest.fn().mockResolvedValue(undefined),
  };

  const workspaceIteratorService = {
    iterate: jest
      .fn()
      .mockImplementation(
        async ({
          workspaceIds,
          callback,
        }: {
          workspaceIds: string[];
          callback: (context: {
            workspaceId: string;
            index: number;
            total: number;
          }) => Promise<void>;
        }) => {
          for (const [index, workspaceId] of workspaceIds.entries()) {
            await callback({ workspaceId, index, total: workspaceIds.length });
          }

          return {
            success: workspaceIds.map((workspaceId) => ({ workspaceId })),
            fail: [],
            interrupted: false,
          };
        },
      ),
  };

  const runner = new UpgradeSequenceRunnerService(
    upgradeMigrationService as unknown as UpgradeMigrationService,
    instanceCommandRunnerService as unknown as InstanceCommandRunnerService,
    workspaceCommandRunnerService as unknown as WorkspaceCommandRunnerService,
    new UpgradeSequenceReaderService({} as never),
    {
      refresh: jest.fn().mockResolvedValue(undefined),
    } as unknown as UpgradeAwareEntityMetadataAdapter,
    workspaceIteratorService as unknown as WorkspaceIteratorService,
    {
      getProvisionedWorkspaceIds: jest
        .fn()
        .mockResolvedValue(
          workspaceCursors.map((cursor) => cursor.workspaceId),
        ),
    } as unknown as WorkspaceVersionService,
    {
      isShutdownRequested: () => false,
    } as unknown as CommandShutdownService,
  );

  jest.spyOn(runner['logger'], 'log').mockImplementation();
  jest.spyOn(runner['logger'], 'warn').mockImplementation();
  jest.spyOn(runner['logger'], 'error').mockImplementation();

  return {
    runner,
    instanceCommandRunnerService,
    workspaceCommandRunnerService,
    workspaceIteratorService,
  };
};

const getRanInstanceSteps = (
  instanceCommandRunnerService: ReturnType<
    typeof buildRunner
  >['instanceCommandRunnerService'],
) =>
  instanceCommandRunnerService.runFastInstanceCommand.mock.calls.map(
    ([args]) => ({
      name: args.name,
      workspaceIdsPastThisStep: args.workspaceIdsPastThisStep,
    }),
  );

const getRanWorkspaceCommandsByWorkspace = (
  workspaceCommandRunnerService: ReturnType<
    typeof buildRunner
  >['workspaceCommandRunnerService'],
) =>
  workspaceCommandRunnerService.runWorkspaceCommands.mock.calls.map(
    ([args]) => ({
      workspaceId: args.iteratorContext.workspaceId,
      commands: args.workspaceCommands.map(
        (command: { name: string }) => command.name,
      ),
    }),
  );

describe('UpgradeSequenceRunnerService — instance command inserted behind an applied workspace segment', () => {
  it('should run an instance command inserted before an already-applied workspace segment without re-running the segment', async () => {
    // Mirrors 2.39.0: [.., Ic0, Ic1 (added later), Wc0, Wc1] with every
    // workspace cursor already at Wc1.
    const sequence = [
      makeStep('fast-instance', 'Ic0'),
      makeStep('fast-instance', 'Ic1'),
      makeStep('workspace', 'Wc0'),
      makeStep('workspace', 'Wc1'),
    ];

    const {
      runner,
      instanceCommandRunnerService,
      workspaceCommandRunnerService,
    } = buildRunner({
      lastAttempted: { name: 'Wc1', status: 'completed' },
      lastAttemptedInstanceCommand: { name: 'Ic0', status: 'completed' },
      workspaceCursors: [makeCursor(WS_1, 'Wc1'), makeCursor(WS_2, 'Wc1')],
    });

    const report = await runner.run({ sequence, options: DEFAULT_OPTIONS });

    expect(report.totalFailures).toBe(0);
    expect(getRanInstanceSteps(instanceCommandRunnerService)).toStrictEqual([
      { name: 'Ic1', workspaceIdsPastThisStep: [WS_1, WS_2] },
    ]);
    expect(
      getRanWorkspaceCommandsByWorkspace(workspaceCommandRunnerService),
    ).toStrictEqual([
      { workspaceId: WS_1, commands: [] },
      { workspaceId: WS_2, commands: [] },
    ]);
  });

  it('should keep resuming at the workspace segment when the preceding instance block is fully attempted', async () => {
    const sequence = [
      makeStep('fast-instance', 'Ic0'),
      makeStep('fast-instance', 'Ic1'),
      makeStep('workspace', 'Wc0'),
      makeStep('workspace', 'Wc1'),
    ];

    const {
      runner,
      instanceCommandRunnerService,
      workspaceCommandRunnerService,
    } = buildRunner({
      lastAttempted: { name: 'Wc0', status: 'completed' },
      lastAttemptedInstanceCommand: { name: 'Ic1', status: 'completed' },
      workspaceCursors: [makeCursor(WS_1, 'Wc0'), makeCursor(WS_2, 'Ic1')],
    });

    await runner.run({ sequence, options: DEFAULT_OPTIONS });

    expect(
      instanceCommandRunnerService.runFastInstanceCommand,
    ).not.toHaveBeenCalled();
    expect(
      getRanWorkspaceCommandsByWorkspace(workspaceCommandRunnerService),
    ).toStrictEqual([
      { workspaceId: WS_1, commands: ['Wc1'] },
      { workspaceId: WS_2, commands: ['Wc0', 'Wc1'] },
    ]);
  });

  it('should record the inserted instance command only for workspaces that have not passed it yet', async () => {
    // WS_1 already applied the segment (-w run); WS_2 still sits at Ic0.
    const sequence = [
      makeStep('fast-instance', 'Ic0'),
      makeStep('fast-instance', 'Ic1'),
      makeStep('workspace', 'Wc0'),
      makeStep('workspace', 'Wc1'),
    ];

    const {
      runner,
      instanceCommandRunnerService,
      workspaceCommandRunnerService,
    } = buildRunner({
      lastAttempted: { name: 'Wc1', status: 'completed' },
      lastAttemptedInstanceCommand: { name: 'Ic0', status: 'completed' },
      workspaceCursors: [makeCursor(WS_1, 'Wc1'), makeCursor(WS_2, 'Ic0')],
    });

    await runner.run({ sequence, options: DEFAULT_OPTIONS });

    expect(getRanInstanceSteps(instanceCommandRunnerService)).toStrictEqual([
      { name: 'Ic1', workspaceIdsPastThisStep: [WS_1] },
    ]);
    expect(
      getRanWorkspaceCommandsByWorkspace(workspaceCommandRunnerService),
    ).toStrictEqual([
      { workspaceId: WS_1, commands: [] },
      { workspaceId: WS_2, commands: ['Wc0', 'Wc1'] },
    ]);
  });

  it('should run an inserted instance command that directly follows an earlier workspace segment', async () => {
    // [Ic0, Wa0, Ic1 (added later), Wb0, Wb1], cursors already at Wb1: the
    // barrier after Wa0 must accept workspaces that moved past it.
    const sequence = [
      makeStep('fast-instance', 'Ic0'),
      makeStep('workspace', 'Wa0'),
      makeStep('fast-instance', 'Ic1'),
      makeStep('workspace', 'Wb0'),
      makeStep('workspace', 'Wb1'),
    ];

    const {
      runner,
      instanceCommandRunnerService,
      workspaceCommandRunnerService,
    } = buildRunner({
      lastAttempted: { name: 'Wb1', status: 'completed' },
      lastAttemptedInstanceCommand: { name: 'Ic0', status: 'completed' },
      workspaceCursors: [makeCursor(WS_1, 'Wb1'), makeCursor(WS_2, 'Wb1')],
    });

    const report = await runner.run({ sequence, options: DEFAULT_OPTIONS });

    expect(report.totalFailures).toBe(0);
    expect(getRanInstanceSteps(instanceCommandRunnerService)).toStrictEqual([
      { name: 'Ic1', workspaceIdsPastThisStep: [WS_1, WS_2] },
    ]);
    expect(
      getRanWorkspaceCommandsByWorkspace(workspaceCommandRunnerService),
    ).toStrictEqual([
      { workspaceId: WS_1, commands: [] },
      { workspaceId: WS_2, commands: [] },
    ]);
  });

  it('should retry a failed instance step that directly follows a workspace segment', async () => {
    const sequence = [
      makeStep('workspace', 'Wc0'),
      makeStep('fast-instance', 'Ic0'),
    ];

    const { runner, instanceCommandRunnerService } = buildRunner({
      lastAttempted: { name: 'Ic0', status: 'failed' },
      lastAttemptedInstanceCommand: { name: 'Ic0', status: 'failed' },
      workspaceCursors: [
        makeCursor(WS_1, 'Ic0', 'failed'),
        makeCursor(WS_2, 'Ic0', 'failed'),
      ],
    });

    const report = await runner.run({ sequence, options: DEFAULT_OPTIONS });

    expect(report.totalFailures).toBe(0);
    expect(getRanInstanceSteps(instanceCommandRunnerService)).toStrictEqual([
      { name: 'Ic0', workspaceIdsPastThisStep: [] },
    ]);
  });

  it('should still refuse an instance step when a workspace has not completed the previous segment', async () => {
    const sequence = [
      makeStep('workspace', 'Wc0'),
      makeStep('workspace', 'Wc1'),
      makeStep('fast-instance', 'Ic0'),
    ];

    const { runner, instanceCommandRunnerService, workspaceIteratorService } =
      buildRunner({
        lastAttempted: { name: 'Wc1', status: 'completed' },
        lastAttemptedInstanceCommand: null,
        workspaceCursors: [
          makeCursor(WS_1, 'Wc1'),
          makeCursor(WS_2, 'Wc0', 'failed'),
        ],
      });

    workspaceIteratorService.iterate.mockResolvedValueOnce({
      success: [],
      fail: [],
      interrupted: false,
    });

    await expect(
      runner.run({ sequence, options: DEFAULT_OPTIONS }),
    ).rejects.toThrow(/has not completed "Wc1"/);
    expect(
      instanceCommandRunnerService.runFastInstanceCommand,
    ).not.toHaveBeenCalled();
  });
});
