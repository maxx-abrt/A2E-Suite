import { Test, type TestingModule } from '@nestjs/testing';

import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { type ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { InstallOnboardingAppsJob } from 'src/engine/core-modules/onboarding/jobs/install-onboarding-apps.job';
import { OnboardingService } from 'src/engine/core-modules/onboarding/onboarding.service';

describe('InstallOnboardingAppsJob', () => {
  let job: InstallOnboardingAppsJob;
  let applicationRegistrationService: ApplicationRegistrationService;
  let applicationInstallService: ApplicationInstallService;
  let onboardingService: OnboardingService;

  const workspaceId = 'workspace-id';
  const userId = 'user-id';
  const callRecorderId = 'call-recorder-uid';
  const peopleDataLabsId = 'people-data-labs-uid';
  const a2eDocumentsId = '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

  const alreadyInstalledError = () =>
    new ApplicationException(
      'App is already installed in this workspace',
      ApplicationExceptionCode.APP_ALREADY_INSTALLED,
    );

  const buildRegistration = (id: string) =>
    ({ id }) as ApplicationRegistrationEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstallOnboardingAppsJob,
        {
          provide: ApplicationRegistrationService,
          useValue: {
            findOneByUniversalIdentifierGlobal: jest.fn(),
          },
        },
        {
          provide: ApplicationInstallService,
          useValue: {
            installApplication: jest.fn(),
          },
        },
        {
          provide: OnboardingService,
          useValue: {
            creditInstallAppsReward: jest.fn(),
            clearReversibleOnboardingStepHistoryAfterAppsInstalled: jest.fn(),
          },
        },
      ],
    }).compile();

    job = module.get<InstallOnboardingAppsJob>(InstallOnboardingAppsJob);
    applicationRegistrationService = module.get<ApplicationRegistrationService>(
      ApplicationRegistrationService,
    );
    applicationInstallService = module.get<ApplicationInstallService>(
      ApplicationInstallService,
    );
    onboardingService = module.get<OnboardingService>(OnboardingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should credit the reward for every requested app and install them', async () => {
    jest
      .spyOn(
        applicationRegistrationService,
        'findOneByUniversalIdentifierGlobal',
      )
      .mockImplementation(async (universalIdentifier) =>
        buildRegistration(`registration-${universalIdentifier}`),
      );
    jest
      .spyOn(applicationInstallService, 'installApplication')
      .mockResolvedValue(true);

    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId, peopleDataLabsId],
    });

    expect(onboardingService.creditInstallAppsReward).toHaveBeenCalledWith({
      workspaceId,
      rewardAppsCount: 2,
    });
    expect(applicationInstallService.installApplication).toHaveBeenCalledTimes(
      2,
    );
  });

  it('should credit only once an install has succeeded', async () => {
    jest
      .spyOn(
        applicationRegistrationService,
        'findOneByUniversalIdentifierGlobal',
      )
      .mockImplementation(async (universalIdentifier) =>
        buildRegistration(`registration-${universalIdentifier}`),
      );
    jest
      .spyOn(applicationInstallService, 'installApplication')
      .mockResolvedValue(true);

    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId],
    });

    const creditOrder = (onboardingService.creditInstallAppsReward as jest.Mock)
      .mock.invocationCallOrder[0];
    const installOrder = (
      applicationInstallService.installApplication as jest.Mock
    ).mock.invocationCallOrder[0];

    expect(installOrder).toBeLessThan(creditOrder);
  });

  it('should not credit again when a failed run is relaunched', async () => {
    jest
      .spyOn(
        applicationRegistrationService,
        'findOneByUniversalIdentifierGlobal',
      )
      .mockResolvedValue(null);

    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId],
      userId,
    });
    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId],
      userId,
    });

    expect(onboardingService.creditInstallAppsReward).not.toHaveBeenCalled();
  });

  it('should not credit when every install fails', async () => {
    jest
      .spyOn(
        applicationRegistrationService,
        'findOneByUniversalIdentifierGlobal',
      )
      .mockImplementation(async (universalIdentifier) =>
        buildRegistration(`registration-${universalIdentifier}`),
      );
    jest
      .spyOn(applicationInstallService, 'installApplication')
      .mockRejectedValue(new Error('install failure'));

    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId, peopleDataLabsId],
    });

    expect(onboardingService.creditInstallAppsReward).not.toHaveBeenCalled();
    expect(applicationInstallService.installApplication).toHaveBeenCalledTimes(
      2,
    );
  });

  it('should credit only the apps that were actually installed when a registration cannot be found', async () => {
    jest
      .spyOn(
        applicationRegistrationService,
        'findOneByUniversalIdentifierGlobal',
      )
      .mockImplementation(async (universalIdentifier) =>
        universalIdentifier === callRecorderId
          ? null
          : buildRegistration(`registration-${universalIdentifier}`),
      );
    jest
      .spyOn(applicationInstallService, 'installApplication')
      .mockResolvedValue(true);

    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId, peopleDataLabsId],
    });

    expect(onboardingService.creditInstallAppsReward).toHaveBeenCalledWith({
      workspaceId,
      rewardAppsCount: 1,
    });
    expect(applicationInstallService.installApplication).toHaveBeenCalledTimes(
      1,
    );
  });

  it('should clear every step to go back to once the apps are scheduled', async () => {
    jest
      .spyOn(
        applicationRegistrationService,
        'findOneByUniversalIdentifierGlobal',
      )
      .mockResolvedValue(buildRegistration('registration-id'));
    jest
      .spyOn(applicationInstallService, 'installApplication')
      .mockResolvedValue(true);

    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId],
      userId,
    });

    expect(
      onboardingService.clearReversibleOnboardingStepHistoryAfterAppsInstalled,
    ).toHaveBeenCalledWith({ userId, workspaceId });
  });

  it('should keep the steps to go back to when every install failed', async () => {
    jest
      .spyOn(
        applicationRegistrationService,
        'findOneByUniversalIdentifierGlobal',
      )
      .mockResolvedValue(null);

    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId, peopleDataLabsId],
      userId,
    });

    expect(
      onboardingService.clearReversibleOnboardingStepHistoryAfterAppsInstalled,
    ).not.toHaveBeenCalled();
  });

  it('should clear the steps to go back to when only some installs succeeded', async () => {
    jest
      .spyOn(
        applicationRegistrationService,
        'findOneByUniversalIdentifierGlobal',
      )
      .mockImplementation(async (universalIdentifier) =>
        universalIdentifier === callRecorderId
          ? buildRegistration('registration-id')
          : null,
      );
    jest
      .spyOn(applicationInstallService, 'installApplication')
      .mockResolvedValue(true);

    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId, peopleDataLabsId],
      userId,
    });

    expect(
      onboardingService.clearReversibleOnboardingStepHistoryAfterAppsInstalled,
    ).toHaveBeenCalledWith({ userId, workspaceId });
  });

  it('should still install when the job was enqueued before it carried a user', async () => {
    jest
      .spyOn(
        applicationRegistrationService,
        'findOneByUniversalIdentifierGlobal',
      )
      .mockResolvedValue(buildRegistration('registration-id'));
    jest
      .spyOn(applicationInstallService, 'installApplication')
      .mockResolvedValue(true);

    await job.handle({
      workspaceId,
      universalIdentifiers: [callRecorderId],
    });

    expect(
      onboardingService.clearReversibleOnboardingStepHistoryAfterAppsInstalled,
    ).not.toHaveBeenCalled();
    expect(applicationInstallService.installApplication).toHaveBeenCalledTimes(
      1,
    );
  });
  describe('when a selected app is already installed (e.g. a bundled A2E app)', () => {
    beforeEach(() => {
      jest
        .spyOn(
          applicationRegistrationService,
          'findOneByUniversalIdentifierGlobal',
        )
        .mockImplementation(async (universalIdentifier) =>
          buildRegistration(`registration-${universalIdentifier}`),
        );
    });

    it('should complete the step without reward or error log when every selected app is already installed', async () => {
      jest
        .spyOn(applicationInstallService, 'installApplication')
        .mockRejectedValue(alreadyInstalledError());

      const loggerErrorSpy = jest.spyOn(
        (job as unknown as { logger: { error: () => void } }).logger,
        'error',
      );

      await job.handle({
        workspaceId,
        universalIdentifiers: [a2eDocumentsId],
        userId,
      });

      expect(onboardingService.creditInstallAppsReward).not.toHaveBeenCalled();
      expect(
        onboardingService.clearReversibleOnboardingStepHistoryAfterAppsInstalled,
      ).toHaveBeenCalledWith({ userId, workspaceId });
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should reward only the apps it installed when others were already there', async () => {
      jest
        .spyOn(applicationInstallService, 'installApplication')
        .mockImplementation(async ({ appRegistrationId }) => {
          if (appRegistrationId === `registration-${a2eDocumentsId}`) {
            throw alreadyInstalledError();
          }

          return true;
        });

      await job.handle({
        workspaceId,
        universalIdentifiers: [a2eDocumentsId, callRecorderId],
        userId,
      });

      expect(onboardingService.creditInstallAppsReward).toHaveBeenCalledWith({
        workspaceId,
        rewardAppsCount: 1,
      });
      expect(
        onboardingService.clearReversibleOnboardingStepHistoryAfterAppsInstalled,
      ).toHaveBeenCalledWith({ userId, workspaceId });
    });

    it('should still treat other install errors as failures', async () => {
      jest
        .spyOn(applicationInstallService, 'installApplication')
        .mockRejectedValue(
          new ApplicationException(
            'Downgrade refused',
            ApplicationExceptionCode.CANNOT_DOWNGRADE_APPLICATION,
          ),
        );

      await job.handle({
        workspaceId,
        universalIdentifiers: [a2eDocumentsId],
        userId,
      });

      expect(onboardingService.creditInstallAppsReward).not.toHaveBeenCalled();
      expect(
        onboardingService.clearReversibleOnboardingStepHistoryAfterAppsInstalled,
      ).not.toHaveBeenCalled();
    });
  });
});
