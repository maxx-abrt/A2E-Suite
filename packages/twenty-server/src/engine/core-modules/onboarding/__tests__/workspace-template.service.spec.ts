import { ModuleRef } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { type ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import { WorkspaceTemplateService } from 'src/engine/core-modules/onboarding/workspace-template.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

describe('WorkspaceTemplateService', () => {
  let service: WorkspaceTemplateService;

  const workspaceId = 'workspace-id';
  const A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER =
    '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

  const buildRegistration = (id: string) =>
    ({ id }) as ApplicationRegistrationEntity;

  const workspaceUpdate = jest.fn().mockResolvedValue(undefined);
  const findOneByUniversalIdentifierGlobal = jest.fn();
  const installApplication = jest.fn().mockResolvedValue(true);
  const getOrRecompute = jest.fn().mockResolvedValue({
    flatNavigationMenuItemMaps: { byUniversalIdentifier: {} },
  });
  const findWorkspaceTwentyStandardAndCustomApplicationOrThrow = jest
    .fn()
    .mockResolvedValue({
      twentyStandardFlatApplication: {
        id: 'standard-app-id',
        universalIdentifier: 'standard-app-uid',
      },
    });
  const validateBuildAndRunWorkspaceMigration = jest
    .fn()
    .mockResolvedValue({ status: 'success' });

  const moduleRefGet = jest.fn();

  beforeEach(async () => {
    moduleRefGet.mockImplementation((token: unknown) => {
      if (token === ApplicationInstallService) {
        return { installApplication };
      }

      throw new Error(`Unexpected ModuleRef.get token: ${String(token)}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceTemplateService,
        {
          provide: getRepositoryToken(WorkspaceEntity),
          useValue: { update: workspaceUpdate },
        },
        {
          provide: ApplicationRegistrationService,
          useValue: { findOneByUniversalIdentifierGlobal },
        },
        {
          provide: ModuleRef,
          useValue: { get: moduleRefGet },
        },
        {
          provide: ApplicationService,
          useValue: { findWorkspaceTwentyStandardAndCustomApplicationOrThrow },
        },
        {
          provide: WorkspaceCacheService,
          useValue: { getOrRecompute },
        },
        {
          provide: WorkspaceMigrationValidateBuildAndRunService,
          useValue: { validateBuildAndRunWorkspaceMigration },
        },
      ],
    }).compile();

    service = module.get<WorkspaceTemplateService>(WorkspaceTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('installs template apps and records the template on the workspace', async () => {
    findOneByUniversalIdentifierGlobal.mockResolvedValue(
      buildRegistration('registration-1'),
    );

    await service.applyWorkspaceTemplate({
      workspaceId,
      template: WorkspaceTemplate.INDIVIDUAL,
    });

    expect(findOneByUniversalIdentifierGlobal).toHaveBeenCalledWith(
      A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
    );
    expect(installApplication).toHaveBeenCalledWith({
      appRegistrationId: 'registration-1',
      workspaceId,
    });
    expect(workspaceUpdate).toHaveBeenCalledWith(
      { id: workspaceId },
      { workspaceTemplate: WorkspaceTemplate.INDIVIDUAL },
    );
  });

  it('skips missing app registrations without failing the whole template', async () => {
    findOneByUniversalIdentifierGlobal.mockResolvedValue(null);

    await service.applyWorkspaceTemplate({
      workspaceId,
      template: WorkspaceTemplate.INDIVIDUAL,
    });

    expect(installApplication).not.toHaveBeenCalled();
    expect(workspaceUpdate).toHaveBeenCalled();
  });

  it('hides CRM navigation rows for CRM-off templates', async () => {
    getOrRecompute.mockResolvedValue({
      flatNavigationMenuItemMaps: {
        byUniversalIdentifier: {
          '20202020-b001-4b01-8b01-c0aba11c0001': {
            id: 'nav-companies',
            universalIdentifier: '20202020-b001-4b01-8b01-c0aba11c0001',
          },
          '20202020-b002-4b02-8b02-c0aba11c0002': {
            id: 'nav-dashboards',
            universalIdentifier: '20202020-b002-4b02-8b02-c0aba11c0002',
          },
        },
      },
    });

    await service.applyWorkspaceTemplate({
      workspaceId,
      template: WorkspaceTemplate.INDIVIDUAL,
    });

    expect(validateBuildAndRunWorkspaceMigration).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        allFlatEntityOperationByMetadataName: {
          navigationMenuItem: {
            flatEntityToCreate: [],
            flatEntityToDelete: [
              expect.objectContaining({
                universalIdentifier: '20202020-b001-4b01-8b01-c0aba11c0001',
              }),
            ],
            flatEntityToUpdate: [],
          },
        },
      }),
    );
  });

  it('leaves navigation untouched for the CRM template', async () => {
    await service.applyWorkspaceTemplate({
      workspaceId,
      template: WorkspaceTemplate.CRM,
    });

    expect(validateBuildAndRunWorkspaceMigration).not.toHaveBeenCalled();
  });
});
