import { InstallPreInstalledAppsCommand } from 'src/database/commands/install-pre-installed-apps.command';

describe('InstallPreInstalledAppsCommand', () => {
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
