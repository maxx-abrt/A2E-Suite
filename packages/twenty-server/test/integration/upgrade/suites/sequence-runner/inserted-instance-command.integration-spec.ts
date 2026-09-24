import {
  type IntegrationTestContext,
  createUpgradeSequenceRunnerIntegrationTestModule,
  DEFAULT_OPTIONS,
  makeFastInstance,
  makeWorkspace,
  migrationRecordToKey,
  resetSeedSequenceCounter,
  restoreUpgradeMigrations,
  seedInstanceMigration,
  seedWorkspaceMigration,
  setMockActiveWorkspaceIds,
  snapshotUpgradeMigrations,
  testGetExecutedMigrationsInOrder,
  WS_1,
  WS_2,
} from 'test/integration/upgrade/utils/upgrade-sequence-runner-integration-test.util';

// An instance command added to an already-shipped version (2.39.0's
// AddBundledAppSourcePath… fast-instance command) lands in the instance block
// right before a workspace segment every workspace has already applied.
describe('UpgradeSequenceRunnerService — instance command inserted behind an applied workspace segment (integration)', () => {
  let context: IntegrationTestContext;
  let savedUpgradeMigrations: Awaited<
    ReturnType<typeof snapshotUpgradeMigrations>
  >;

  beforeAll(async () => {
    context = await createUpgradeSequenceRunnerIntegrationTestModule();
    savedUpgradeMigrations = await snapshotUpgradeMigrations(
      context.dataSource,
    );
  }, 30000);

  afterAll(async () => {
    await restoreUpgradeMigrations(context.dataSource, savedUpgradeMigrations);
    await context.module?.close();
    await context.dataSource?.destroy();
  }, 15000);

  beforeEach(async () => {
    await context.dataSource.query('DELETE FROM core."upgradeMigration"');
    resetSeedSequenceCounter();
    setMockActiveWorkspaceIds([]);
    jest.restoreAllMocks();
  });

  const seedAppliedSegment = async ({
    instanceCommandNames,
    workspaceCommandNames,
  }: {
    instanceCommandNames: string[];
    workspaceCommandNames: string[];
  }) => {
    for (const name of instanceCommandNames) {
      await seedInstanceMigration(context.dataSource, {
        name,
        status: 'completed',
        workspaceIds: [WS_1, WS_2],
      });
    }

    for (const workspaceId of [WS_1, WS_2]) {
      for (const name of workspaceCommandNames) {
        await seedWorkspaceMigration(context.dataSource, {
          name,
          status: 'completed',
          workspaceId,
        });
      }
    }
  };

  it('should run the inserted instance command once, without re-running the applied segment', async () => {
    // Sequence: Ic0 → Ic1 (inserted) → Wc0 → Wc1
    const sequence = [
      makeFastInstance('Ic0'),
      makeFastInstance('Ic1'),
      makeWorkspace('Wc0'),
      makeWorkspace('Wc1'),
    ];

    setMockActiveWorkspaceIds([WS_1, WS_2]);

    await seedAppliedSegment({
      instanceCommandNames: ['Ic0'],
      workspaceCommandNames: ['Wc0', 'Wc1'],
    });

    const firstRun = await context.runner.run({
      sequence,
      options: DEFAULT_OPTIONS,
    });

    expect(firstRun.totalFailures).toBe(0);

    const expectedAfterFirstRun = [
      // Seeds
      'Ic0:instance:completed:1',
      `Ic0:${WS_1}:completed:1`,
      `Ic0:${WS_2}:completed:1`,
      `Wc0:${WS_1}:completed:1`,
      `Wc1:${WS_1}:completed:1`,
      `Wc0:${WS_2}:completed:1`,
      `Wc1:${WS_2}:completed:1`,

      // Inserted instance command runs; workspaces already past it keep
      // their Wc1 cursor (no workspace-scoped row is written for them)
      'Ic1:instance:completed:1',
    ];

    expect(
      (await testGetExecutedMigrationsInOrder(context.dataSource)).map(
        migrationRecordToKey,
      ),
    ).toStrictEqual(expectedAfterFirstRun);

    // A second boot is a no-op: the applied segment is not re-queued
    const secondRun = await context.runner.run({
      sequence,
      options: DEFAULT_OPTIONS,
    });

    expect(secondRun.totalFailures).toBe(0);
    expect(
      (await testGetExecutedMigrationsInOrder(context.dataSource)).map(
        migrationRecordToKey,
      ),
    ).toStrictEqual(expectedAfterFirstRun);
  });

  it('should write the inserted command cursor only for workspaces that have not passed it', async () => {
    // Sequence: Ic0 → Ic1 (inserted) → Wc0 → Wc1
    // WS_1 applied the segment via -w; WS_2 still sits at Ic0
    const sequence = [
      makeFastInstance('Ic0'),
      makeFastInstance('Ic1'),
      makeWorkspace('Wc0'),
      makeWorkspace('Wc1'),
    ];

    setMockActiveWorkspaceIds([WS_1, WS_2]);

    await seedInstanceMigration(context.dataSource, {
      name: 'Ic0',
      status: 'completed',
      workspaceIds: [WS_1, WS_2],
    });
    await seedWorkspaceMigration(context.dataSource, {
      name: 'Wc0',
      status: 'completed',
      workspaceId: WS_1,
    });
    await seedWorkspaceMigration(context.dataSource, {
      name: 'Wc1',
      status: 'completed',
      workspaceId: WS_1,
    });

    const report = await context.runner.run({
      sequence,
      options: DEFAULT_OPTIONS,
    });

    expect(report.totalFailures).toBe(0);
    expect(
      (await testGetExecutedMigrationsInOrder(context.dataSource)).map(
        migrationRecordToKey,
      ),
    ).toStrictEqual([
      // Seeds
      'Ic0:instance:completed:1',
      `Ic0:${WS_1}:completed:1`,
      `Ic0:${WS_2}:completed:1`,
      `Wc0:${WS_1}:completed:1`,
      `Wc1:${WS_1}:completed:1`,

      // Inserted instance command: workspace row only for WS_2
      'Ic1:instance:completed:1',
      `Ic1:${WS_2}:completed:1`,

      // WS_2 then runs the full segment, WS_1 is already done
      `Wc0:${WS_2}:completed:1`,
      `Wc1:${WS_2}:completed:1`,
    ]);
  });

  it('should run an inserted instance command that directly follows an earlier workspace segment', async () => {
    // Sequence: Ic0 → Wa0 → Ic1 (inserted) → Wb0 → Wb1
    const sequence = [
      makeFastInstance('Ic0'),
      makeWorkspace('Wa0'),
      makeFastInstance('Ic1'),
      makeWorkspace('Wb0'),
      makeWorkspace('Wb1'),
    ];

    setMockActiveWorkspaceIds([WS_1, WS_2]);

    await seedAppliedSegment({
      instanceCommandNames: ['Ic0'],
      workspaceCommandNames: ['Wa0', 'Wb0', 'Wb1'],
    });

    const report = await context.runner.run({
      sequence,
      options: DEFAULT_OPTIONS,
    });

    expect(report.totalFailures).toBe(0);
    expect(
      (await testGetExecutedMigrationsInOrder(context.dataSource)).map(
        migrationRecordToKey,
      ),
    ).toStrictEqual([
      // Seeds
      'Ic0:instance:completed:1',
      `Ic0:${WS_1}:completed:1`,
      `Ic0:${WS_2}:completed:1`,
      `Wa0:${WS_1}:completed:1`,
      `Wb0:${WS_1}:completed:1`,
      `Wb1:${WS_1}:completed:1`,
      `Wa0:${WS_2}:completed:1`,
      `Wb0:${WS_2}:completed:1`,
      `Wb1:${WS_2}:completed:1`,

      // The Wa0 barrier accepts workspaces that already moved past it
      'Ic1:instance:completed:1',
    ]);
  });

  it('should retry a failed instance command that directly follows a workspace segment', async () => {
    // Sequence: Ic0 → Wc0 → Ic1
    const failOnce = { shouldFail: true };

    const sequence = [
      makeFastInstance('Ic0'),
      makeWorkspace('Wc0'),
      {
        ...makeFastInstance('Ic1'),
        command: {
          up: async () => {
            if (failOnce.shouldFail) {
              failOnce.shouldFail = false;
              throw new Error('Ic1 temporary failure');
            }
          },
          down: async () => {},
        },
      } as unknown as ReturnType<typeof makeFastInstance>,
    ];

    setMockActiveWorkspaceIds([WS_1, WS_2]);

    await seedAppliedSegment({
      instanceCommandNames: ['Ic0'],
      workspaceCommandNames: ['Wc0'],
    });

    await expect(
      context.runner.run({ sequence, options: DEFAULT_OPTIONS }),
    ).rejects.toThrow('Ic1 temporary failure');

    const report = await context.runner.run({
      sequence,
      options: DEFAULT_OPTIONS,
    });

    expect(report.totalFailures).toBe(0);

    const executed = (
      await testGetExecutedMigrationsInOrder(context.dataSource)
    ).map(migrationRecordToKey);

    expect(executed.slice(-3)).toStrictEqual([
      'Ic1:instance:completed:2',
      `Ic1:${WS_1}:completed:2`,
      `Ic1:${WS_2}:completed:2`,
    ]);
  });
});
