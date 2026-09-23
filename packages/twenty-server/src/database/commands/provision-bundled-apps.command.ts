import { Command, CommandRunner, Option } from 'nest-commander';

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 } from 'uuid';

import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

import { Repository } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import { ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';
import { extractTarballSecurely } from 'src/engine/core-modules/application/application-package/utils/extract-tarball-securely.util';
import { readJsonFile } from 'src/engine/core-modules/application/application-package/utils/read-json-file.util';
import { resolvePackageContentDir } from 'src/engine/core-modules/application/application-package/utils/tarball-utils';
import { fromManifestApplicationToDisplayFields } from 'src/engine/core-modules/application/application-registration/utils/from-manifest-application-to-display-fields.util';
import { type Manifest } from 'twenty-shared/application';
import { type PackageJson } from 'type-fest';

// Default directory for bundled app tarballs in the production Docker image.
// Override with the BUNDLED_APPS_DIR environment variable.
const DEFAULT_BUNDLED_APPS_DIR = '/app/packages/twenty-apps/dist';

interface CommandOptions {
  dryRun?: boolean;
  dir?: string;
}

// Registers A2E apps bundled into the Docker image at build time so that they
// appear in Settings → Applications → A2E Suite on a fresh deployment without
// requiring a manual `app:publish` + `app:install` ritual (M1 provisioning).
//
// The command is idempotent: already-registered apps at the same version are
// skipped; a newer bundled version updates the registration. It is called by
// entrypoint.sh after the upgrade command on every boot.
@Command({
  name: 'app:provision-bundled',
  description:
    'Register A2E apps bundled in the Docker image (M1 provisioning). Idempotent. Called by entrypoint.sh at startup.',
})
export class ProvisionBundledAppsCommand extends CommandRunner {
  private readonly logger = new Logger(ProvisionBundledAppsCommand.name);

  constructor(
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(ApplicationRegistrationEntity)
    private readonly registrationRepository: Repository<ApplicationRegistrationEntity>,
  ) {
    super();
  }

  async run(
    _passedParams: string[],
    options: CommandOptions,
  ): Promise<void> {
    const dryRun = options.dryRun ?? false;
    const bundledDir =
      options.dir ??
      process.env['BUNDLED_APPS_DIR'] ??
      DEFAULT_BUNDLED_APPS_DIR;

    let tarballPaths: string[];

    try {
      const entries = await fs.readdir(bundledDir);

      tarballPaths = entries
        .filter((f) => f.endsWith('.tgz'))
        .map((f) => join(bundledDir, f));
    } catch (error) {
      // Directory absent on non-Docker (dev) servers — silently skip.
      // No `instanceof Error` guard: native fs errors are not realm-equal
      // under Jest, and `.code` is the only contract that matters here.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.log(
          `Bundled apps directory ${bundledDir} not found — skipping (expected on non-Docker servers)`,
        );

        return;
      }

      throw error;
    }

    if (tarballPaths.length === 0) {
      this.logger.log(`No bundled app tarballs found in ${bundledDir}`);

      return;
    }

    this.logger.log(
      `Found ${tarballPaths.length} bundled tarball(s) in ${bundledDir}`,
    );

    let registered = 0;
    let updated = 0;
    let skipped = 0;

    for (const tarballPath of tarballPaths) {
      try {
        const result = await this.processTarball(tarballPath, dryRun);

        if (result === 'registered') registered++;
        else if (result === 'updated') updated++;
        else skipped++;
      } catch (error) {
        this.logger.error(
          `Failed to process bundled tarball ${tarballPath}: ${error}`,
        );
      }
    }

    this.logger.log(
      `${dryRun ? '[DRY RUN] ' : ''}Bundled app provisioning complete: ${registered} registered, ${updated} updated, ${skipped} skipped`,
    );
  }

  private async processTarball(
    tarballPath: string,
    dryRun: boolean,
  ): Promise<'registered' | 'updated' | 'skipped'> {
    const workDir = join(tmpdir(), 'twenty-bundled-provision', v4());

    await fs.mkdir(workDir, { recursive: true });

    try {
      await extractTarballSecurely(tarballPath, workDir);

      const contentDir = await resolvePackageContentDir(workDir);
      const manifest = await readJsonFile<Manifest>(contentDir, 'manifest.json');
      const packageJson = await readJsonFile<PackageJson>(
        contentDir,
        'package.json',
      );

      if (!isDefined(manifest) || !isDefined(packageJson)) {
        this.logger.warn(
          `Tarball ${tarballPath} is missing manifest.json or package.json — skipping`,
        );

        return 'skipped';
      }

      const universalIdentifier =
        manifest.application?.universalIdentifier;

      if (!isDefined(universalIdentifier)) {
        this.logger.warn(
          `Tarball ${tarballPath} manifest has no universalIdentifier — skipping`,
        );

        return 'skipped';
      }

      const version = packageJson.version ?? null;

      // Check for existing registration.
      const existing = await this.registrationRepository.findOne({
        where: { universalIdentifier },
      });

      if (
        isDefined(existing) &&
        existing.latestAvailableVersion === version &&
        existing.sourceType === ApplicationRegistrationSourceType.BUNDLED
      ) {
        this.logger.log(
          `${universalIdentifier} v${version} already registered as bundled — skipping`,
        );

        return 'skipped';
      }

      const displayFields = fromManifestApplicationToDisplayFields(
        manifest.application,
      );

      if (dryRun) {
        const action = isDefined(existing) ? 'update' : 'register';

        this.logger.log(
          `[DRY RUN] Would ${action} bundled app ${universalIdentifier} v${version} from ${tarballPath}`,
        );

        return isDefined(existing) ? 'updated' : 'registered';
      }

      if (isDefined(existing)) {
        // Update the registration to the new bundled version.
        await this.registrationRepository.save({
          ...existing,
          manifest: manifest as Manifest,
          latestAvailableVersion: version,
          sourceType: ApplicationRegistrationSourceType.BUNDLED,
          bundledAppSourcePath: tarballPath,
          isPreInstalled: true,
          ...displayFields,
        });

        this.logger.log(
          `Updated bundled app ${universalIdentifier} to v${version}`,
        );

        return 'updated';
      }

      // New registration — create with ownerWorkspaceId: null (globally
      // available, not workspace-owned) and isPreInstalled: true so the
      // PreInstalledAppsService auto-installs it on every workspace.
      await this.registrationRepository.save(
        this.registrationRepository.create({
          universalIdentifier,
          name: manifest.application?.displayName ?? 'Unknown App',
          sourceType: ApplicationRegistrationSourceType.BUNDLED,
          bundledAppSourcePath: tarballPath,
          manifest: manifest as Manifest,
          latestAvailableVersion: version,
          isListed: true,
          isVetted: false,
          isPreInstalled: true,
          oAuthClientId: v4(),
          oAuthRedirectUris: [],
          oAuthScopes: [],
          ownerWorkspaceId: null,
          ...displayFields,
        }),
      );

      this.logger.log(
        `Registered bundled app ${universalIdentifier} v${version} from ${tarballPath}`,
      );

      return 'registered';
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {
        // best-effort cleanup
      });
    }
  }

  @Option({
    flags: '--dry-run',
    description: 'Preview without writing to the database',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '--dir <path>',
    description: 'Directory containing bundled app tarballs (overrides BUNDLED_APPS_DIR env var)',
  })
  parseDir(val: string): string {
    return val;
  }
}
