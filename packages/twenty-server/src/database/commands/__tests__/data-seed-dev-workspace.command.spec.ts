import { DataSeedWorkspaceCommand } from 'src/database/commands/data-seed-dev-workspace.command';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

describe('DataSeedWorkspaceCommand', () => {
  it.each([{}, { light: true }])(
    'creates a small workspace without demo objects by default (%j)',
    async (options) => {
      const seedDev = jest.fn().mockResolvedValue(undefined);
      const command = new DataSeedWorkspaceCommand({ seedDev } as never);

      await command.run([], options);

      expect(seedDev).toHaveBeenCalledTimes(1);
      expect(seedDev).toHaveBeenCalledWith(SEED_APPLE_WORKSPACE_ID, {
        light: true,
      });
    },
  );

  it('keeps complete fixtures available explicitly for CI', async () => {
    const seedDev = jest.fn().mockResolvedValue(undefined);
    const command = new DataSeedWorkspaceCommand({ seedDev } as never);

    await command.run([], { fullFixtures: true });

    expect(seedDev.mock.calls).toEqual([
      [SEED_APPLE_WORKSPACE_ID, { light: false }],
      [SEED_YCOMBINATOR_WORKSPACE_ID, { light: false }],
    ]);
  });

  it('rejects conflicting options without creating data', async () => {
    const seedDev = jest.fn();
    const command = new DataSeedWorkspaceCommand({ seedDev } as never);

    await expect(
      command.run([], { light: true, fullFixtures: true }),
    ).rejects.toThrow('cannot be used together');
    expect(seedDev).not.toHaveBeenCalled();
  });

  it('fails the command when provisioning fails', async () => {
    const seedDev = jest
      .fn()
      .mockRejectedValue(new Error('metadata unavailable'));
    const command = new DataSeedWorkspaceCommand({ seedDev } as never);

    await expect(command.run([], {})).rejects.toThrow('metadata unavailable');
  });
});
