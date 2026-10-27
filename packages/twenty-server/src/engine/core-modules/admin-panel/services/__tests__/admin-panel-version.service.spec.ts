import { Test } from '@nestjs/testing';

import { AdminPanelVersionService } from 'src/engine/core-modules/admin-panel/services/admin-panel-version.service';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const CURRENT_REVISION = 'a'.repeat(40);
const LATEST_REVISION = 'b'.repeat(40);

describe('A2E version verification', () => {
  let service: AdminPanelVersionService;
  let values: Record<string, string | undefined>;
  let publishedRevision: string;
  let sourceRevision: string;
  let comparisonStatus: string;
  let hasPublishedBuild: boolean;
  const get = jest.fn();

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-27T00:00:00Z'));
    jest.clearAllMocks();
    values = {
      APP_VERSION: '0.2.1',
      APP_REVISION: CURRENT_REVISION,
      APP_BUILD_ID: '51.2',
      APP_BUILD_DATE: '2026-10-26T23:00:00Z',
    };
    publishedRevision = CURRENT_REVISION;
    sourceRevision = CURRENT_REVISION;
    comparisonStatus = 'behind';
    hasPublishedBuild = true;
    get.mockImplementation(async (url: string) => {
      if (url.includes('/commits/main'))
        return { data: { sha: sourceRevision } };
      if (url.includes('/actions/workflows/'))
        return {
          data: {
            workflow_runs: hasPublishedBuild
              ? [
                  {
                    id: 123,
                    head_sha: publishedRevision,
                    run_number: 51,
                    run_attempt: 2,
                  },
                ]
              : [],
          },
        };
      if (url.includes('/contents/package.json'))
        return { data: { version: '0.2.1' } };
      if (url.includes('/compare/'))
        return { data: { status: comparisonStatus } };
      throw new Error('Unexpected release endpoint');
    });
    const module = await Test.createTestingModule({
      providers: [
        AdminPanelVersionService,
        {
          provide: TwentyConfigService,
          useValue: { get: (key: string) => values[key] },
        },
        {
          provide: SecureHttpClientService,
          useValue: { getHttpClient: () => ({ get }) },
        },
      ],
    }).compile();
    service = module.get(AdminPanelVersionService);
  });

  afterEach(() => jest.useRealTimers());

  it('reports image identity and links the validated A2E build rather than upstream tags', async () => {
    const info = await service.getVersionInfo();
    expect(info).toMatchObject({
      currentVersion: '0.2.1',
      currentRevision: CURRENT_REVISION,
      currentBuildId: '51.2',
      latestVersion: '0.2.1',
      latestBuildId: '51.2',
      latestBuildUrl: 'https://github.com/maxx-abrt/A2E-Suite/actions/runs/123',
      synchronizationStatus: 'CURRENT',
    });
    expect(
      get.mock.calls.every(([url]) =>
        String(url).startsWith(
          'https://api.github.com/repos/maxx-abrt/A2E-Suite/',
        ),
      ),
    ).toBe(true);
  });

  it.each([
    ['behind', 'UPDATE_AVAILABLE'],
    ['ahead', 'AHEAD'],
    ['diverged', 'DIVERGED'],
  ])(
    'distinguishes Git ancestry %s from a safe forward update',
    async (comparison, expectedStatus) => {
      publishedRevision = LATEST_REVISION;
      comparisonStatus = comparison;
      const info = await service.getVersionInfo();
      expect(info.synchronizationStatus).toBe(expectedStatus);
      expect(get).toHaveBeenCalledWith(
        expect.stringContaining(
          `/compare/${LATEST_REVISION}...${CURRENT_REVISION}`,
        ),
      );
    },
  );

  it('distinguishes unbuilt GitHub code from the latest validated image', async () => {
    sourceRevision = LATEST_REVISION;
    expect(await service.getVersionInfo()).toMatchObject({
      sourceRevision: LATEST_REVISION,
      latestRevision: CURRENT_REVISION,
      synchronizationStatus: 'CURRENT',
    });
  });

  it('detects another image build for the same Git revision', async () => {
    values.APP_BUILD_ID = '50.1';
    expect((await service.getVersionInfo()).synchronizationStatus).toBe(
      'BUILD_MISMATCH',
    );
  });

  it('does not claim an unidentifiable development build is current', async () => {
    values.APP_REVISION = 'unknown';
    expect((await service.getVersionInfo()).synchronizationStatus).toBe(
      'DEVELOPMENT',
    );
    expect(
      get.mock.calls.some(([url]) => String(url).includes('/compare/')),
    ).toBe(false);
  });

  it('does not equate a main commit with a published image when no build passed', async () => {
    hasPublishedBuild = false;
    expect(await service.getVersionInfo()).toMatchObject({
      latestVersion: null,
      synchronizationStatus: 'UNKNOWN',
    });
  });

  it('preserves running identity without claiming success when GitHub is unavailable', async () => {
    get.mockRejectedValue(new Error('rate limited'));
    expect(await service.getVersionInfo()).toMatchObject({
      currentVersion: '0.2.1',
      currentRevision: CURRENT_REVISION,
      synchronizationStatus: 'UNKNOWN',
    });
  });

  it('rejects malformed release metadata', async () => {
    publishedRevision = 'malformed';
    expect((await service.getVersionInfo()).synchronizationStatus).toBe(
      'UNKNOWN',
    );
  });

  it('coalesces concurrent checks and caches results for ten minutes', async () => {
    await Promise.all([service.getVersionInfo(), service.getVersionInfo()]);
    expect(get).toHaveBeenCalledTimes(3);
    await service.getVersionInfo();
    expect(get).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(10 * 60 * 1000 + 1);
    await service.getVersionInfo();
    expect(get).toHaveBeenCalledTimes(6);
  });
});
