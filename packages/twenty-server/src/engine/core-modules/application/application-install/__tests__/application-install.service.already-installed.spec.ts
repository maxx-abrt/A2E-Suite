import { type Repository } from 'typeorm';

import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { type ApplicationManifestApplyService } from 'src/engine/core-modules/application/application-manifest/application-manifest-apply.service';
import { type ApplicationSyncService } from 'src/engine/core-modules/application/application-manifest/application-sync.service';
import { type ApplicationPackageFetcherService } from 'src/engine/core-modules/application/application-package/application-package-fetcher.service';
import { ApplicationVersionValidationService } from 'src/engine/core-modules/application/application-package/application-version-validation.service';
import { type ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';
import { ApplicationExceptionCode } from 'src/engine/core-modules/application/application.exception';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { ApplicationState } from 'src/engine/core-modules/application/enums/application-state.enum';
import { type CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { type FileStorageService } from 'src/engine/core-modules/file-storage/services/file-storage.service';
import { type LogicFunctionExecutorService } from 'src/engine/core-modules/logic-function/logic-function-executor/logic-function-executor.service';
import { type MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { MetricsKeys } from 'src/engine/core-modules/metrics/types/metrics-keys.type';
import { type UpgradeStatusService } from 'src/engine/core-modules/upgrade/services/upgrade-status.service';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

const WORKSPACE_ID = 'workspace-id';
const UNIVERSAL_IDENTIFIER = 'b11cd01f-0000-4000-8000-000000000001';

const buildService = ({
  installedVersion,
  incomingVersion,
  postInstall,
  applicationState = ApplicationState.INSTALLED,
  isFreshInstall = false,
}: {
  installedVersion: string;
  incomingVersion: string;
  applicationState?: ApplicationState;
  isFreshInstall?: boolean;
  postInstall?: {
    shouldRunSynchronously: boolean;
    shouldRunOnVersionUpgrade: boolean;
  };
}) => {
  const registration = {
    id: 'registration-id',
    universalIdentifier: UNIVERSAL_IDENTIFIER,
    sourceType: ApplicationRegistrationSourceType.BUNDLED,
  };

  const appRegistrationRepository = {
    findOne: jest.fn().mockResolvedValue(registration),
  };

  const application = {
    id: 'application-id',
    universalIdentifier: UNIVERSAL_IDENTIFIER,
    version: isFreshInstall ? null : installedVersion,
    state: applicationState,
    logoFileId: null,
  };
  const findByUniversalIdentifier = jest.fn().mockResolvedValue(application);

  if (isFreshInstall) {
    findByUniversalIdentifier.mockResolvedValueOnce(null);
  }

  const applicationService = {
    findByUniversalIdentifier,
    create: jest.fn().mockResolvedValue(application),
    update: jest.fn().mockResolvedValue(undefined),
    revertStateToInstalledBestEffort: jest.fn().mockResolvedValue(undefined),
  };

  const applicationPackageFetcherService = {
    resolvePackage: jest.fn().mockResolvedValue({
      manifest: {
        application: {
          displayName: 'A2E Drive',
          ...(postInstall
            ? {
                postInstallLogicFunction: {
                  universalIdentifier: 'post-install-identifier',
                  ...postInstall,
                },
              }
            : {}),
        },
      },
      packageJson: { version: incomingVersion },
      extractedDir: '/tmp/extracted',
      cleanupDir: '/tmp/extracted',
    }),
    cleanupExtractedDir: jest.fn().mockResolvedValue(undefined),
  };

  const applicationSyncService = {
    uninstallApplication: jest.fn().mockResolvedValue(undefined),
  };

  const applicationManifestApplyService = {
    applyManifestToWorkspace: jest.fn().mockImplementation(async () => {
      application.version = incomingVersion;
    }),
    refreshRegistrationFromManifest: jest.fn().mockResolvedValue(undefined),
  };

  const metricsService = {
    incrementCounterBy: jest.fn(),
  };

  const execute = jest.fn().mockResolvedValue({});
  const enqueue = jest.fn().mockResolvedValue(undefined);

  const service = new ApplicationInstallService(
    appRegistrationRepository as unknown as Repository<ApplicationRegistrationEntity>,
    applicationService as unknown as ApplicationService,
    applicationPackageFetcherService as unknown as ApplicationPackageFetcherService,
    new ApplicationVersionValidationService(
      {} as unknown as UpgradeStatusService,
    ),
    applicationSyncService as unknown as ApplicationSyncService,
    applicationManifestApplyService as unknown as ApplicationManifestApplyService,
    {} as unknown as FileStorageService,
    { execute } as unknown as LogicFunctionExecutorService,
    {
      withLock: jest.fn().mockImplementation((callback) => callback()),
    } as unknown as CacheLockService,
    { add: enqueue } as unknown as MessageQueueService,
    {
      getOrRecompute: jest.fn().mockResolvedValue({
        flatLogicFunctionMaps: {
          byUniversalIdentifier: {
            'post-install-identifier': { id: 'post-install-id' },
          },
        },
      }),
    } as unknown as WorkspaceCacheService,
    metricsService as unknown as MetricsService,
  );

  const internals = service as unknown as Record<string, jest.Mock>;

  for (const privateStep of ['writeFilesToStorage', 'runPreInstallHook']) {
    jest.spyOn(internals, privateStep).mockResolvedValue(undefined);
  }

  jest.spyOn(internals, 'importLogoFile').mockResolvedValue(null);

  const logger = service['logger'];

  const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation();
  const loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();

  jest.spyOn(logger, 'log').mockImplementation();

  return {
    service,
    execute,
    enqueue,
    applicationService,
    applicationSyncService,
    applicationManifestApplyService,
    metricsService,
    loggerErrorSpy,
    loggerWarnSpy,
  };
};

const install = (service: ApplicationInstallService) =>
  service.installApplication({
    appRegistrationId: 'registration-id',
    workspaceId: WORKSPACE_ID,
    skipWorkspaceCompatibilityCheck: true,
  });

describe('ApplicationInstallService — already-installed version', () => {
  it('should refuse the installed version without state change, rollback, error log or failure metric', async () => {
    const {
      service,
      applicationService,
      applicationSyncService,
      applicationManifestApplyService,
      metricsService,
      loggerErrorSpy,
      loggerWarnSpy,
    } = buildService({ installedVersion: '0.1.0', incomingVersion: '0.1.0' });

    await expect(install(service)).rejects.toMatchObject({
      code: ApplicationExceptionCode.APP_ALREADY_INSTALLED,
    });

    expect(applicationService.update).not.toHaveBeenCalled();
    expect(
      applicationService.revertStateToInstalledBestEffort,
    ).not.toHaveBeenCalled();
    expect(applicationSyncService.uninstallApplication).not.toHaveBeenCalled();
    expect(
      applicationManifestApplyService.applyManifestToWorkspace,
    ).not.toHaveBeenCalled();
    expect(metricsService.incrementCounterBy).not.toHaveBeenCalled();
    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(loggerWarnSpy).not.toHaveBeenCalled();
  });

  it('should refuse a downgrade before flipping the application to UPGRADING', async () => {
    const {
      service,
      applicationService,
      metricsService,
      loggerErrorSpy,
      loggerWarnSpy,
    } = buildService({ installedVersion: '0.2.0', incomingVersion: '0.1.0' });

    await expect(install(service)).rejects.toMatchObject({
      code: ApplicationExceptionCode.CANNOT_DOWNGRADE_APPLICATION,
    });

    expect(applicationService.update).not.toHaveBeenCalled();
    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    expect(metricsService.incrementCounterBy).toHaveBeenCalledWith(
      expect.objectContaining({ key: MetricsKeys.AppUpgradeFailed }),
    );
  });

  it('should still upgrade an installed application to a newer version', async () => {
    const {
      service,
      applicationService,
      applicationManifestApplyService,
      metricsService,
      loggerErrorSpy,
    } = buildService({ installedVersion: '0.1.0', incomingVersion: '0.2.0' });

    await expect(install(service)).resolves.toBe(true);

    expect(
      applicationService.update.mock.calls.map(([, update]) => update.state),
    ).toStrictEqual([ApplicationState.UPGRADING, ApplicationState.INSTALLED]);
    expect(
      applicationManifestApplyService.applyManifestToWorkspace,
    ).toHaveBeenCalledTimes(1);
    expect(metricsService.incrementCounterBy).toHaveBeenCalledWith(
      expect.objectContaining({ key: MetricsKeys.AppUpgradeSucceeded }),
    );
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });
});

describe('ApplicationInstallService post-install scheduling', () => {
  const buildPostInstallService = () =>
    buildService({
      installedVersion: '0.1.0',
      incomingVersion: '0.2.0',
      postInstall: {
        shouldRunSynchronously: true,
        shouldRunOnVersionUpgrade: true,
      },
    });

  it('waits for synchronous hooks during an interactive install', async () => {
    const { service, execute, enqueue } = buildPostInstallService();

    await expect(install(service)).resolves.toBe(true);

    expect(execute).toHaveBeenCalledWith({
      logicFunctionId: 'post-install-id',
      workspaceId: WORKSPACE_ID,
      payload: { previousVersion: '0.1.0', newVersion: '0.2.0' },
    });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('queues synchronous hooks during startup without making an HTTP call', async () => {
    const { service, execute, enqueue } = buildPostInstallService();

    await expect(
      service.installApplication({
        appRegistrationId: 'registration-id',
        workspaceId: WORKSPACE_ID,
        skipWorkspaceCompatibilityCheck: true,
        shouldDeferPostInstall: true,
      }),
    ).resolves.toBe(true);

    expect(execute).not.toHaveBeenCalled();
    expect(enqueue).toHaveBeenCalledWith(
      'LogicFunctionTriggerJob',
      {
        logicFunctionId: 'post-install-id',
        workspaceId: WORKSPACE_ID,
        payload: { previousVersion: '0.1.0', newVersion: '0.2.0' },
      },
      expect.objectContaining({ retryLimit: 3 }),
    );
  });

  it('fails startup installation if the hook cannot be durably queued', async () => {
    const { service, enqueue, applicationService } = buildPostInstallService();
    enqueue.mockRejectedValue(new Error('queue unavailable'));

    await expect(
      service.installApplication({
        appRegistrationId: 'registration-id',
        workspaceId: WORKSPACE_ID,
        skipWorkspaceCompatibilityCheck: true,
        shouldDeferPostInstall: true,
      }),
    ).rejects.toThrow('queue unavailable');

    expect(applicationService.update).not.toHaveBeenCalledWith(
      'application-id',
      expect.objectContaining({ state: ApplicationState.INSTALLED }),
    );
  });

  it('preserves synchronous hook failures for interactive installs', async () => {
    const { service, execute, enqueue } = buildPostInstallService();
    execute.mockResolvedValue({ error: { errorMessage: 'API unavailable' } });

    await expect(install(service)).rejects.toMatchObject({
      code: ApplicationExceptionCode.POST_INSTALL_ERROR,
    });
    expect(enqueue).not.toHaveBeenCalled();
  });
});

describe('ApplicationInstallService interrupted first installs', () => {
  it.each([false, true])(
    'preserves committed metadata when the first hook fails (fresh row: %s)',
    async (isFreshInstall) => {
      const {
        service,
        execute,
        applicationService,
        applicationSyncService,
        applicationManifestApplyService,
        metricsService,
      } = buildService({
        installedVersion: '0.1.0',
        incomingVersion: '0.1.0',
        applicationState: ApplicationState.INSTALLING,
        isFreshInstall,
        postInstall: {
          shouldRunSynchronously: true,
          shouldRunOnVersionUpgrade: false,
        },
      });
      execute.mockResolvedValueOnce({
        error: { errorMessage: 'API unavailable' },
      });

      await expect(install(service)).rejects.toMatchObject({
        code: ApplicationExceptionCode.POST_INSTALL_ERROR,
      });
      expect(
        applicationSyncService.uninstallApplication,
      ).not.toHaveBeenCalled();
      expect(applicationService.update).not.toHaveBeenCalledWith(
        'application-id',
        expect.objectContaining({ state: ApplicationState.INSTALLED }),
      );

      await expect(install(service)).resolves.toBe(true);

      expect(
        applicationManifestApplyService.applyManifestToWorkspace,
      ).toHaveBeenCalledTimes(2);
      expect(
        applicationSyncService.uninstallApplication,
      ).not.toHaveBeenCalled();
      expect(applicationService.create).toHaveBeenCalledTimes(
        isFreshInstall ? 1 : 0,
      );
      expect(execute).toHaveBeenCalledTimes(2);
      expect(execute).toHaveBeenLastCalledWith(
        expect.objectContaining({
          payload: { previousVersion: undefined, newVersion: '0.1.0' },
        }),
      );
      expect(metricsService.incrementCounterBy).toHaveBeenLastCalledWith(
        expect.objectContaining({ key: MetricsKeys.AppInstallSucceeded }),
      );
    },
  );

  it('keeps pending metadata after schema or SDK failure', async () => {
    const { service, applicationManifestApplyService, applicationSyncService } =
      buildService({
        installedVersion: '0.1.0',
        incomingVersion: '0.1.0',
        applicationState: ApplicationState.INSTALLING,
      });
    applicationManifestApplyService.applyManifestToWorkspace.mockRejectedValue(
      new Error('schema unavailable'),
    );

    await expect(install(service)).rejects.toThrow('schema unavailable');
    expect(applicationSyncService.uninstallApplication).not.toHaveBeenCalled();
  });

  it('still refuses a downgrade of an interrupted installation', async () => {
    const { service, applicationManifestApplyService, applicationSyncService } =
      buildService({
        installedVersion: '0.2.0',
        incomingVersion: '0.1.0',
        applicationState: ApplicationState.INSTALLING,
      });

    await expect(install(service)).rejects.toMatchObject({
      code: ApplicationExceptionCode.CANNOT_DOWNGRADE_APPLICATION,
    });
    expect(
      applicationManifestApplyService.applyManifestToWorkspace,
    ).not.toHaveBeenCalled();
    expect(applicationSyncService.uninstallApplication).not.toHaveBeenCalled();
  });
});
