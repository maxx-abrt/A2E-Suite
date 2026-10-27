import { Injectable, Logger } from '@nestjs/common';

import semver from 'semver';
import * as z from 'zod';

import { type VersionInfoDTO } from 'src/engine/core-modules/admin-panel/dtos/version-info.dto';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const REPOSITORY = 'maxx-abrt/A2E-Suite';
const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
const API_URL = `https://api.github.com/repos/${REPOSITORY}`;
const VERSION_CACHE_MS = 10 * 60 * 1000;
const VERSION_REQUEST_TIMEOUT_MS = 7000;
const REVISION_SCHEMA = z.string().regex(/^[a-f0-9]{40}$/);
const BUILD_SCHEMA = z.object({
  id: z.number().int().positive(),
  head_sha: REVISION_SCHEMA,
  run_number: z.number().int().positive(),
  run_attempt: z.number().int().positive(),
});

@Injectable()
export class AdminPanelVersionService {
  private readonly logger = new Logger(AdminPanelVersionService.name);
  private cachedInfo?: { expiresAt: number; value: VersionInfoDTO };
  private pendingInfo?: Promise<VersionInfoDTO>;

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  async getVersionInfo(): Promise<VersionInfoDTO> {
    if (this.cachedInfo && Date.now() < this.cachedInfo.expiresAt)
      return this.cachedInfo.value;

    if (this.pendingInfo) return this.pendingInfo;

    this.pendingInfo = this.fetchVersionInfo();
    try {
      const value = await this.pendingInfo;
      this.cachedInfo = { value, expiresAt: Date.now() + VERSION_CACHE_MS };
      return value;
    } finally {
      this.pendingInfo = undefined;
    }
  }

  private async fetchVersionInfo(): Promise<VersionInfoDTO> {
    const info: VersionInfoDTO = {
      currentVersion: this.twentyConfigService.get('APP_VERSION'),
      currentRevision: this.twentyConfigService.get('APP_REVISION'),
      currentBuildId: this.twentyConfigService.get('APP_BUILD_ID'),
      builtAt: this.twentyConfigService.get('APP_BUILD_DATE'),
      repositoryUrl: REPOSITORY_URL,
      checkedAt: new Date().toISOString(),
      latestVersion: null,
      synchronizationStatus: 'UNKNOWN',
    };

    try {
      const httpClient = this.secureHttpClientService.getHttpClient({
        timeout: VERSION_REQUEST_TIMEOUT_MS,
        signal: AbortSignal.timeout(VERSION_REQUEST_TIMEOUT_MS),
        retries: 0,
        maxRedirects: 0,
        maxContentLength: 1024 * 1024,
        headers: { Accept: 'application/vnd.github+json' },
      });
      const [commitResponse, buildsResponse] = await Promise.all([
        httpClient.get<unknown>(`${API_URL}/commits/main`),
        httpClient.get<unknown>(
          `${API_URL}/actions/workflows/cd-docker-image.yaml/runs?branch=main&status=success&per_page=1`,
        ),
      ]);
      info.sourceRevision = z
        .object({ sha: REVISION_SCHEMA })
        .parse(commitResponse.data).sha;
      const build = z
        .object({ workflow_runs: z.array(BUILD_SCHEMA) })
        .parse(buildsResponse.data).workflow_runs[0];
      if (!build) return info;

      info.latestRevision = build.head_sha;
      info.latestBuildId = `${build.run_number}.${build.run_attempt}`;
      info.latestBuildUrl = `${REPOSITORY_URL}/actions/runs/${build.id}`;
      const packageResponse = await httpClient.get<unknown>(
        `${API_URL}/contents/package.json?ref=${build.head_sha}`,
        { headers: { Accept: 'application/vnd.github.raw+json' } },
      );
      info.latestVersion = z
        .object({
          version: z.string().refine((value) => semver.valid(value) !== null),
        })
        .parse(packageResponse.data).version;

      if (!REVISION_SCHEMA.safeParse(info.currentRevision).success) {
        info.synchronizationStatus = 'DEVELOPMENT';
      } else if (info.currentRevision === info.latestRevision) {
        const hasDifferentBuild =
          info.currentBuildId && info.currentBuildId !== info.latestBuildId;
        const hasDifferentVersion =
          info.currentVersion && info.currentVersion !== info.latestVersion;
        info.synchronizationStatus =
          hasDifferentBuild || hasDifferentVersion
            ? 'BUILD_MISMATCH'
            : 'CURRENT';
      } else {
        const comparison = await httpClient.get<unknown>(
          `${API_URL}/compare/${info.latestRevision}...${info.currentRevision}`,
        );
        const { status } = z
          .object({
            status: z.enum(['ahead', 'behind', 'diverged', 'identical']),
          })
          .parse(comparison.data);
        info.synchronizationStatus =
          status === 'behind'
            ? 'UPDATE_AVAILABLE'
            : status === 'ahead'
              ? 'AHEAD'
              : status === 'identical'
                ? 'CURRENT'
                : 'DIVERGED';
      }
      return info;
    } catch {
      // Offline/rate-limited checks must never claim that this server is current.
      this.logger.warn(
        'A2E release check unavailable; retaining local image identity',
      );
      return info;
    }
  }
}
