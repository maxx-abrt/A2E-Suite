import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';

import { type DataSource } from 'typeorm';

import { BillingCreditService } from 'src/engine/core-modules/billing/services/billing-credit.service';
import { BillingService } from 'src/engine/core-modules/billing/services/billing.service';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { getQueueToken } from 'src/engine/core-modules/message-queue/utils/get-queue-token.util';
import { INSTALL_ONBOARDING_APPS_JOB_NAME } from 'src/engine/core-modules/onboarding/jobs/install-onboarding-apps.job-constants';
import { OnboardingService } from 'src/engine/core-modules/onboarding/onboarding.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserVarsService } from 'src/engine/core-modules/user/user-vars/services/user-vars.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

// US-089: the onboarding "install apps" step must forward the A2E apps the
// front offers instead of silently dropping them before the job is enqueued.

const A2E_DOCUMENTS = '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';
const A2E_DRIVE = 'b11cd01f-75de-4acd-8e67-0e9c484fde02';
const A2E_CRM = 'c31e0000-0000-4000-8000-000000000000';
const CALL_RECORDER = '8da4b8b5-5edf-4880-b51f-ab6e679ec617';

describe('OnboardingService.triggerInstallAppsOnboardingStep', () => {
  let service: OnboardingService;

  const userId = 'user-id';
  const workspaceId = 'workspace-id';

  const enqueue = jest.fn();
  const deleteUserVar = jest.fn();
  const setUserVar = jest.fn();

  beforeEach(async () => {
    enqueue.mockResolvedValue(undefined);
    // 1 affected row: this request claims the pending install-apps step.
    deleteUserVar.mockResolvedValue(1);

    const dataSource = {
      transaction: jest.fn((runInTransaction) =>
        runInTransaction({ queryRunner: { query: jest.fn() } }),
      ),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: BillingService, useValue: { isBillingEnabled: jest.fn() } },
        {
          provide: BillingCreditService,
          useValue: { grantCredits: jest.fn() },
        },
        {
          provide: ExceptionHandlerService,
          useValue: { captureExceptions: jest.fn() },
        },
        {
          provide: UserVarsService,
          useValue: {
            get: jest.fn(),
            set: setUserVar,
            delete: deleteUserVar,
            setIfNotExists: jest.fn(),
          },
        },
        { provide: TwentyConfigService, useValue: { get: jest.fn() } },
        { provide: getRepositoryToken(WorkspaceEntity), useValue: {} },
        { provide: getRepositoryToken(UserWorkspaceEntity), useValue: {} },
        {
          provide: getQueueToken(MessageQueue.workspaceQueue),
          useValue: { add: enqueue },
        },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('enqueues the install job for a selection made only of A2E apps', async () => {
    await service.triggerInstallAppsOnboardingStep({
      userId,
      workspaceId,
      universalIdentifiers: [A2E_DOCUMENTS, A2E_DRIVE, A2E_CRM],
      isAutoSkipped: false,
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith(
      INSTALL_ONBOARDING_APPS_JOB_NAME,
      {
        workspaceId,
        universalIdentifiers: [A2E_DOCUMENTS, A2E_DRIVE, A2E_CRM],
        userId,
      },
      { id: `${INSTALL_ONBOARDING_APPS_JOB_NAME}-${workspaceId}` },
    );
  });

  it('forwards A2E and upstream apps together and drops unknown identifiers', async () => {
    await service.triggerInstallAppsOnboardingStep({
      userId,
      workspaceId,
      universalIdentifiers: [
        A2E_DOCUMENTS,
        'not-an-onboarding-app',
        CALL_RECORDER,
      ],
      isAutoSkipped: false,
    });

    expect(enqueue).toHaveBeenCalledWith(
      INSTALL_ONBOARDING_APPS_JOB_NAME,
      expect.objectContaining({
        universalIdentifiers: [A2E_DOCUMENTS, CALL_RECORDER],
      }),
      expect.anything(),
    );
  });

  it('enqueues nothing when no selected identifier is installable', async () => {
    await service.triggerInstallAppsOnboardingStep({
      userId,
      workspaceId,
      universalIdentifiers: ['not-an-onboarding-app'],
      isAutoSkipped: true,
    });

    expect(enqueue).not.toHaveBeenCalled();
    expect(deleteUserVar).toHaveBeenCalled();
  });
});
