import { Readable } from 'stream';

import * as fs from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import unzipper from 'unzipper';

import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { FileStorageService } from 'src/engine/core-modules/file-storage/services/file-storage.service';
import { SdkClientArchiveService } from 'src/engine/core-modules/sdk-client/sdk-client-archive.service';
import { SdkClientGenerationService } from 'src/engine/core-modules/sdk-client/sdk-client-generation.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

// Regression cover for the live 0-rows failure (phase-01-report 2026-09-16):
// the SDK layer under the worker tmpdir was found as dirs-with-zero-files
// because a lock expiry let the second holder `rm` the first holder's live
// extraction. `import 'twenty-client-sdk/core'` then resolved through an empty
// package, every Bilan post-install seed step threw, and the install hook
// completed while writing 0 rows. These cases pin the staging invariant that
// replaced the direct-to-live extraction: the live path is either absent or a
// complete package — never a half-written one.

jest.mock('unzipper', () => ({
  __esModule: true,
  default: { Open: { buffer: jest.fn() } },
}));

const openBufferMock = unzipper.Open.buffer as unknown as jest.Mock;

const WORKSPACE_ID = 'workspace-1';
const APPLICATION_ID = 'application-1';
const APPLICATION_UNIVERSAL_IDENTIFIER = 'app-uid';

describe('SdkClientArchiveService staged extraction', () => {
  let service: SdkClientArchiveService;
  let rootPath: string;
  let livePath: string;

  const readFile = jest.fn();

  const publishCompleteLayer = async (packagePath: string) => {
    await fs.mkdir(join(packagePath, 'dist'), { recursive: true });
    await fs.writeFile(join(packagePath, 'package.json'), '{"name":"ours"}');
    await fs.writeFile(join(packagePath, 'dist', 'core.mjs'), 'ours');
  };

  const listStagingSiblings = async () => {
    const entries = await fs.readdir(rootPath);

    return entries.filter((entry) => entry.includes('.staging-'));
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    rootPath = await fs.mkdtemp(join(tmpdir(), 'sdk-layer-staged-extraction-'));
    livePath = join(rootPath, 'twenty-client-sdk');

    readFile.mockResolvedValue(Readable.from([Buffer.from('archive')]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SdkClientArchiveService,
        { provide: FileStorageService, useValue: { readFile } },
        { provide: getRepositoryToken(ApplicationEntity), useValue: {} },
        { provide: WorkspaceCacheService, useValue: {} },
        { provide: SdkClientGenerationService, useValue: {} },
      ],
    }).compile();

    service = module.get<SdkClientArchiveService>(SdkClientArchiveService);
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  const extract = (run: (stagingPath: string) => Promise<void>) => {
    openBufferMock.mockResolvedValue({
      extract: async ({ path }: { path: string }) => run(path),
    });
  };

  const downloadToLivePath = () =>
    service.downloadAndExtractToPackage({
      workspaceId: WORKSPACE_ID,
      applicationId: APPLICATION_ID,
      applicationUniversalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
      targetPackagePath: livePath,
    });

  it('only publishes a layer that carries both import entrypoints', async () => {
    extract(publishCompleteLayer);

    await downloadToLivePath();

    await expect(
      fs.access(join(livePath, 'package.json')),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(join(livePath, 'dist', 'core.mjs')),
    ).resolves.toBeUndefined();
    expect(await listStagingSiblings()).toEqual([]);
  });

  it('never exposes a half-written layer when extraction dies mid-package', async () => {
    // The truncated layer from the live incident: package.json present, the
    // `dist/core.mjs` the hook imports through missing.
    extract(async (stagingPath) => {
      await fs.writeFile(join(stagingPath, 'package.json'), 'partial');
    });

    await expect(downloadToLivePath()).rejects.toThrow();

    // The failure must leave the live path absent, not a partial package that
    // `coreClient()` would load and then seed 0 rows from.
    await expect(fs.access(livePath)).rejects.toThrow();
    expect(await listStagingSiblings()).toEqual([]);
  });

  it('leaves no staging debris when the archive cannot be opened', async () => {
    openBufferMock.mockRejectedValue(new Error('invalid zip'));

    await expect(downloadToLivePath()).rejects.toThrow('invalid zip');

    await expect(fs.access(livePath)).rejects.toThrow();
    expect(await listStagingSiblings()).toEqual([]);
  });

  it('replaces an unknown-completeness layer a concurrent holder swapped in', async () => {
    extract(async (stagingPath) => {
      await publishCompleteLayer(stagingPath);

      // Simulates the second holder publishing between our rm and our rename.
      await fs.mkdir(join(livePath, 'dist'), { recursive: true });
      await fs.writeFile(
        join(livePath, 'package.json'),
        '{"name":"concurrent"}',
      );
      await fs.writeFile(join(livePath, 'dist', 'core.mjs'), 'concurrent');
    });

    await downloadToLivePath();

    expect(await fs.readFile(join(livePath, 'package.json'), 'utf8')).toBe(
      '{"name":"ours"}',
    );
    expect(await fs.readFile(join(livePath, 'dist', 'core.mjs'), 'utf8')).toBe(
      'ours',
    );
    expect(await listStagingSiblings()).toEqual([]);
  });
});
