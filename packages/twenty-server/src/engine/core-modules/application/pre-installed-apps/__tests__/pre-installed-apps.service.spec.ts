import { PreInstalledAppsService } from 'src/engine/core-modules/application/pre-installed-apps/pre-installed-apps.service';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';

type Registration = { id: string; name: string };

const buildService = ({
  registrations,
  installApplication,
}: {
  registrations: Registration[];
  installApplication: jest.Mock;
}) =>
  new PreInstalledAppsService(
    { installApplication } as never,
    { find: jest.fn().mockResolvedValue(registrations) } as never,
    {} as never,
    {} as never,
  );

describe('PreInstalledAppsService.installOnWorkspace', () => {
  it('retries apps whose dependencies get installed in an earlier pass', async () => {
    const installed = new Set<string>();
    const dependencies: Record<string, string[]> = {
      documents: [],
      projects: ['documents'],
      chat: ['projects'],
    };

    const installApplication = jest.fn(
      async ({ appRegistrationId }: { appRegistrationId: string }) => {
        const missing = dependencies[appRegistrationId].filter(
          (dependency) => !installed.has(dependency),
        );

        if (missing.length > 0) {
          throw new Error(`missing ${missing.join(',')}`);
        }

        installed.add(appRegistrationId);
      },
    );

    const service = buildService({
      registrations: [
        { id: 'chat', name: 'Chat' },
        { id: 'projects', name: 'Projects' },
        { id: 'documents', name: 'Documents' },
      ],
      installApplication,
    });

    await service.installOnWorkspace('workspace-id');

    expect([...installed].sort()).toEqual(['chat', 'documents', 'projects']);
  });

  it('forwards startup hook deferral to every installation', async () => {
    const installApplication = jest.fn().mockResolvedValue(true);
    const service = buildService({
      registrations: [{ id: 'documents', name: 'Documents' }],
      installApplication,
    });

    await service.installOnWorkspace('workspace-id', {
      shouldDeferPostInstall: true,
    });

    expect(installApplication).toHaveBeenCalledWith({
      appRegistrationId: 'documents',
      workspaceId: 'workspace-id',
      shouldDeferPostInstall: true,
    });
  });

  it('stops when a pass makes no progress', async () => {
    const installApplication = jest
      .fn()
      .mockRejectedValue(new Error('broken manifest'));

    const service = buildService({
      registrations: [{ id: 'broken', name: 'Broken' }],
      installApplication,
    });

    await expect(service.installOnWorkspace('workspace-id')).rejects.toThrow(
      'Failed to install 1 pre-installed app(s)',
    );

    expect(installApplication).toHaveBeenCalledTimes(1);
  });

  it('treats already-installed apps as installed', async () => {
    const installApplication = jest
      .fn()
      .mockRejectedValue(
        new ApplicationException(
          'already installed',
          ApplicationExceptionCode.APP_ALREADY_INSTALLED,
        ),
      );

    const service = buildService({
      registrations: [{ id: 'documents', name: 'Documents' }],
      installApplication,
    });

    await service.installOnWorkspace('workspace-id');

    expect(installApplication).toHaveBeenCalledTimes(1);
  });
});
