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
}: {
  installedVersion: string;
  incomingVersion: string;
}) => {
  const registration = {
    id: 'registration-id',
    universalIdentifier: UNIVERSAL_IDENTIFIER,
    sourceType: ApplicationRegistrationSourceType.BUNDLED,
  };

  const appRegistrationRepository = {
    findOne: jest.fn().mockResolvedValue(registration),
  };

  const applicationService = {
    findByUniversalIdentifier: jest.fn().mockResolvedValue({
      id: 'application-id',
      universalIdentifier: UNIVERSAL_IDENTIFIER,
      version: installedVersion,
      state: ApplicationState.INSTALLED,
      logoFileId: null,
    }),
    update: jest.fn().mockResolvedValue(undefined),
    revertStateToInstalledBestEffort: jest.fn().mockResolvedValue(undefined),
  };

  const applicationPackageFetcherService = {
    resolvePackage: jest.fn().mockResolvedValue({
      manifest: { application: { displayName: 'A2E Drive' } },
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
    applyManifestToWorkspace: jest.fn().mockResolvedValue(undefined),
    refreshRegistrationFromManifest: jest.fn().mockResolvedValue(undefined),
  };

  const metricsService = {
    incrementCounterBy: jest.fn(),
  };

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
    {} as unknown as LogicFunctionExecutorService,
    {
      withLock: jest.fn().mockImplementation((callback) => callback()),
    } as unknown as CacheLockService,
    {} as unknown as MessageQueueService,
    {} as unknown as WorkspaceCacheService,
    metricsService as unknown as MetricsService,
  );

  const internals = service as unknown as Record<string, jest.Mock>;

  for (const privateStep of [
    'writeFilesToStorage',
    'runPreInstallHook',
    'runPostInstallHook',
  ]) {
    jest.spyOn(internals, privateStep).mockResolvedValue(undefined);
  }

  jest.spyOn(internals, 'importLogoFile').mockResolvedValue(null);

  const logger = service['logger'];

  const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation();
  const loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();

  jest.spyOn(logger, 'log').mockImplementation();

  return {
    service,
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
