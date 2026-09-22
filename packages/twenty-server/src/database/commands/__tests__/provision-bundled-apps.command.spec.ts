import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { type Repository } from 'typeorm';

import { ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';
import { ProvisionBundledAppsCommand } from 'src/database/commands/provision-bundled-apps.command';

// These heavy utilities are filesystem/tarball operations — mock them entirely
// to keep the unit spec fast and deterministic.
jest.mock(
  'src/engine/core-modules/application/application-package/utils/extract-tarball-securely.util',
  () => ({ extractTarballSecurely: jest.fn().mockResolvedValue(undefined) }),
);

jest.mock(
  'src/engine/core-modules/application/application-package/utils/tarball-utils',
  () => ({
    resolvePackageContentDir: jest.fn().mockImplementation((dir: string) =>
      Promise.resolve(join(dir, 'package')),
    ),
  }),
);

jest.mock(
  'src/engine/core-modules/application/application-package/utils/read-json-file.util',
  () => ({
    readJsonFile: jest
      .fn()
      .mockImplementation((_dir: string, filename: string) => {
        if (filename === 'manifest.json') {
          return Promise.resolve({
            application: {
              universalIdentifier: 'test-uid-1234',
              displayName: 'Test App',
            },
          });
        }

        if (filename === 'package.json') {
          return Promise.resolve({ name: 'test-app', version: '1.0.0' });
        }

        return Promise.resolve(null);
      }),
  }),
);

jest.mock(
  'src/engine/core-modules/application/application-registration/utils/from-manifest-application-to-display-fields.util',
  () => ({
    fromManifestApplicationToDisplayFields: jest.fn().mockReturnValue({
      name: 'Test App',
      description: 'Test description',
    }),
  }),
);

describe('ProvisionBundledAppsCommand', () => {
  let command: ProvisionBundledAppsCommand;
  let registrationRepository: jest.Mocked<Repository<ApplicationRegistrationEntity>>;

  const workDir = join(tmpdir(), 'provision-bundled-test');

  beforeEach(async () => {
    registrationRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
    } as unknown as jest.Mocked<Repository<ApplicationRegistrationEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvisionBundledAppsCommand,
        {
          provide: getRepositoryToken(ApplicationRegistrationEntity),
          useValue: registrationRepository,
        },
      ],
    }).compile();

    command = module.get<ProvisionBundledAppsCommand>(
      ProvisionBundledAppsCommand,
    );
  });

  describe('when the bundled apps directory does not exist', () => {
    it('silently succeeds without touching the database', async () => {
      // A path that does not exist — simulates a non-Docker (dev) server.
      await command.run([], { dir: '/nonexistent-bundled-apps-dir' });

      expect(registrationRepository.findOne).not.toHaveBeenCalled();
      expect(registrationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('when the bundled apps directory exists', () => {
    const tarballPath = join(workDir, 'test-app-1.0.0.tgz');

    beforeEach(async () => {
      await fs.mkdir(workDir, { recursive: true });
      // Write a placeholder .tgz so readdir finds it.
      await fs.writeFile(tarballPath, Buffer.alloc(0));
    });

    afterEach(async () => {
      await fs.rm(workDir, { recursive: true, force: true });
    });

    it('registers a new bundled app with isPreInstalled=true and ownerWorkspaceId=null', async () => {
      registrationRepository.findOne.mockResolvedValue(null);
      registrationRepository.save.mockImplementation(async (entity) =>
        entity as ApplicationRegistrationEntity,
      );

      await command.run([], { dir: workDir });

      expect(registrationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          universalIdentifier: 'test-uid-1234',
          sourceType: ApplicationRegistrationSourceType.BUNDLED,
          bundledAppSourcePath: tarballPath,
          isPreInstalled: true,
          ownerWorkspaceId: null,
          isListed: true,
          latestAvailableVersion: '1.0.0',
        }),
      );
    });

    it('skips registration when the same version is already registered as BUNDLED', async () => {
      registrationRepository.findOne.mockResolvedValue({
        id: 'existing-id',
        universalIdentifier: 'test-uid-1234',
        latestAvailableVersion: '1.0.0',
        sourceType: ApplicationRegistrationSourceType.BUNDLED,
        bundledAppSourcePath: tarballPath,
      } as ApplicationRegistrationEntity);

      await command.run([], { dir: workDir });

      expect(registrationRepository.save).not.toHaveBeenCalled();
    });

    it('updates an existing registration when a newer version is bundled', async () => {
      const oldRegistration = {
        id: 'existing-id',
        universalIdentifier: 'test-uid-1234',
        latestAvailableVersion: '0.9.0',
        sourceType: ApplicationRegistrationSourceType.BUNDLED,
        bundledAppSourcePath: '/old/path/test-app-0.9.0.tgz',
      } as ApplicationRegistrationEntity;

      registrationRepository.findOne.mockResolvedValue(oldRegistration);
      registrationRepository.save.mockImplementation(async (entity) =>
        entity as ApplicationRegistrationEntity,
      );

      await command.run([], { dir: workDir });

      expect(registrationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-id',
          latestAvailableVersion: '1.0.0',
          bundledAppSourcePath: tarballPath,
          sourceType: ApplicationRegistrationSourceType.BUNDLED,
        }),
      );
    });

    it('does not write to the database in dry-run mode', async () => {
      registrationRepository.findOne.mockResolvedValue(null);

      await command.run([], { dir: workDir, dryRun: true });

      expect(registrationRepository.save).not.toHaveBeenCalled();
    });
  });
});
