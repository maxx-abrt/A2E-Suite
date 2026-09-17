import { ApplicationInstallReadinessService } from 'src/engine/core-modules/application/application-install/services/application-install-readiness.service';
import { ApplicationVersionValidationService } from 'src/engine/core-modules/application/application-package/application-version-validation.service';
import { type ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { type ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';

const WORKSPACE_ID = 'workspace-1';
const APP_UNIVERSAL_IDENTIFIER = '11111111-1111-4111-8111-111111111111';
const OTHER_APP_UNIVERSAL_IDENTIFIER = '22222222-2222-4222-8222-222222222222';

const buildRegistration = ({
  requiredServerVersionRange,
}: {
  requiredServerVersionRange: string | null;
}) =>
  ({
    universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
    manifest: {
      application: { requiredServerVersionRange },
    },
  }) as unknown as ApplicationRegistrationEntity;

describe('ApplicationInstallReadinessService', () => {
  let applicationRegistrationService: ApplicationRegistrationService;
  let applicationVersionValidationService: ApplicationVersionValidationService;
  let applicationService: ApplicationService;
  let readinessService: ApplicationInstallReadinessService;

  beforeEach(() => {
    applicationRegistrationService = {
      findOneByUniversalIdentifierGlobal: jest.fn(),
    } as unknown as ApplicationRegistrationService;

    applicationVersionValidationService = {
      validateWorkspaceCompatibility: jest
        .fn()
        .mockResolvedValue({ compatible: true }),
    } as unknown as ApplicationVersionValidationService;

    applicationService = {
      findByUniversalIdentifier: jest.fn().mockResolvedValue(null),
    } as unknown as ApplicationService;

    readinessService = new ApplicationInstallReadinessService(
      applicationRegistrationService,
      applicationVersionValidationService,
      applicationService,
    );
  });

  it('reports ready for a registered, version-compatible app not yet installed', async () => {
    jest
      .mocked(applicationRegistrationService.findOneByUniversalIdentifierGlobal)
      .mockResolvedValue(
        buildRegistration({ requiredServerVersionRange: '^2.39.0' }),
      );

    const readiness = await readinessService.getInstallReadiness({
      workspaceId: WORKSPACE_ID,
      universalIdentifiers: [APP_UNIVERSAL_IDENTIFIER],
    });

    expect(readiness).toEqual([
      {
        universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
        registered: true,
        versionCompatible: true,
        currentlyInstalled: false,
        ready: true,
        blockedReason: null,
      },
    ]);
    expect(
      applicationVersionValidationService.validateWorkspaceCompatibility,
    ).toHaveBeenCalledWith({
      requiredServerVersion: '^2.39.0',
      workspaceId: WORKSPACE_ID,
    });
  });

  it('blocks a registered but version-incompatible app with VERSION_INCOMPATIBLE', async () => {
    jest
      .mocked(applicationRegistrationService.findOneByUniversalIdentifierGlobal)
      .mockResolvedValue(
        buildRegistration({ requiredServerVersionRange: '^3.0.0' }),
      );
    jest
      .mocked(
        applicationVersionValidationService.validateWorkspaceCompatibility,
      )
      .mockResolvedValue({
        compatible: false,
        reason: 'WORKSPACE_INCOMPATIBLE',
        message: 'App requires Twenty server ^3.0.0',
      });

    const [readiness] = await readinessService.getInstallReadiness({
      workspaceId: WORKSPACE_ID,
      universalIdentifiers: [APP_UNIVERSAL_IDENTIFIER],
    });

    expect(readiness).toEqual({
      universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
      registered: true,
      versionCompatible: false,
      currentlyInstalled: false,
      ready: false,
      blockedReason: 'VERSION_INCOMPATIBLE',
    });
  });

  it('blocks an unregistered app without asking the version validator', async () => {
    jest
      .mocked(applicationRegistrationService.findOneByUniversalIdentifierGlobal)
      .mockResolvedValue(null);

    const [readiness] = await readinessService.getInstallReadiness({
      workspaceId: WORKSPACE_ID,
      universalIdentifiers: [APP_UNIVERSAL_IDENTIFIER],
    });

    expect(readiness).toEqual({
      universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
      registered: false,
      versionCompatible: false,
      currentlyInstalled: false,
      ready: false,
      blockedReason: 'APP_NOT_REGISTERED',
    });
    expect(
      applicationVersionValidationService.validateWorkspaceCompatibility,
    ).not.toHaveBeenCalled();
  });

  it('flags an already-installed compatible app as currentlyInstalled and ready to upgrade', async () => {
    jest
      .mocked(applicationRegistrationService.findOneByUniversalIdentifierGlobal)
      .mockResolvedValue(
        buildRegistration({ requiredServerVersionRange: null }),
      );
    jest
      .mocked(applicationService.findByUniversalIdentifier)
      .mockResolvedValue({
        id: 'application-1',
      } as unknown as ApplicationEntity);

    const [readiness] = await readinessService.getInstallReadiness({
      workspaceId: WORKSPACE_ID,
      universalIdentifiers: [APP_UNIVERSAL_IDENTIFIER],
    });

    expect(readiness.currentlyInstalled).toBe(true);
    expect(readiness.ready).toBe(true);
    expect(readiness.blockedReason).toBeNull();
  });

  it('reports each requested identifier independently', async () => {
    jest
      .mocked(applicationRegistrationService.findOneByUniversalIdentifierGlobal)
      .mockImplementation(async (universalIdentifier) =>
        universalIdentifier === APP_UNIVERSAL_IDENTIFIER
          ? buildRegistration({ requiredServerVersionRange: null })
          : null,
      );

    const readiness = await readinessService.getInstallReadiness({
      workspaceId: WORKSPACE_ID,
      universalIdentifiers: [
        APP_UNIVERSAL_IDENTIFIER,
        OTHER_APP_UNIVERSAL_IDENTIFIER,
      ],
    });

    expect(readiness).toHaveLength(2);
    expect(readiness[0].ready).toBe(true);
    expect(readiness[1]).toMatchObject({
      universalIdentifier: OTHER_APP_UNIVERSAL_IDENTIFIER,
      ready: false,
      blockedReason: 'APP_NOT_REGISTERED',
    });
  });
});
