import { InstallPreInstalledAppsCommand } from 'src/database/commands/install-pre-installed-apps.command';

describe('InstallPreInstalledAppsCommand', () => {
  it.each([true, false])(
    'defers hooks only with the explicit startup option (%s)',
    async (deferPostInstall) => {
      const installOnWorkspace = jest.fn().mockResolvedValue(undefined);
      const command = new InstallPreInstalledAppsCommand(
        {} as never,
        { installOnWorkspace } as never,
      );

      await command.runOnWorkspace({
        workspaceId: 'workspace-id',
        options: { deferPostInstall },
        index: 0,
        total: 1,
      });

      expect(installOnWorkspace).toHaveBeenCalledWith('workspace-id', {
        shouldDeferPostInstall: deferPostInstall,
      });
    },
  );

  it('returns a failed command when any workspace installation failed', async () => {
    const command = new InstallPreInstalledAppsCommand(
      {
        listenToShutdownSignals: jest.fn(),
        iterate: jest.fn().mockResolvedValue({
          success: [{ workspaceId: 'healthy-workspace' }],
          fail: [
            {
              workspaceId: 'broken-workspace',
              error: new Error('install failed'),
            },
          ],
          interrupted: false,
        }),
      } as never,
      {} as never,
    );

    await expect(command.run([], {})).rejects.toThrow('1 failed workspace(s)');
  });
});
