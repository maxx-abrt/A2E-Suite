import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUNDLED_APPLICATION_NAMES = [
  'a2e-documents',
  'a2e-accounting',
  'a2e-projects',
  'a2e-chat',
  'a2e-drive',
  'a2e-crm',
  'a2e-links',
];

export const buildBundledApplications = ({
  rootDirectory,
  outputDirectory = join(rootDirectory, 'dist'),
  runCommand = execFileSync,
}) => {
  mkdirSync(outputDirectory, { recursive: true });
  const archives = [];

  for (const applicationName of BUNDLED_APPLICATION_NAMES) {
    const applicationDirectory = join(rootDirectory, applicationName);
    console.log(`Building bundled application ${applicationName}`);
    try {
      try {
        createRequire(join(applicationDirectory, 'package.json')).resolve(
          'twenty-shared/application',
        );
      } catch (error) {
        throw new Error(
          'Native twenty-shared/application is unavailable in the app build context',
          { cause: error },
        );
      }
      const commandOptions = { cwd: applicationDirectory, stdio: 'inherit' };
      // Separate calls propagate every failure; a shell && list inside a loop can hide earlier failures.
      runCommand('yarn', ['install', '--immutable'], commandOptions);
      runCommand('yarn', ['twenty', 'dev:build', '--tarball'], commandOptions);

      const sourcePackage = JSON.parse(
        readFileSync(join(applicationDirectory, 'package.json'), 'utf8'),
      );
      const buildDirectory = join(applicationDirectory, '.twenty', 'output');
      const builtPackage = JSON.parse(
        readFileSync(join(buildDirectory, 'package.json'), 'utf8'),
      );
      if (
        sourcePackage.name !== applicationName ||
        builtPackage.name !== applicationName ||
        builtPackage.version !== sourcePackage.version
      ) {
        throw new Error(
          'Built package identity/version differs from its source',
        );
      }
      const archiveName = `${applicationName}-${sourcePackage.version}.tgz`;
      const archivePath = join(buildDirectory, archiveName);
      const archiveContents = execFileSync('tar', ['-tzf', archivePath], {
        encoding: 'utf8',
      });
      if (!archiveContents.split('\n').includes('package/manifest.json')) {
        throw new Error('Archive has no package/manifest.json');
      }
      const manifest = JSON.parse(
        execFileSync('tar', ['-xOzf', archivePath, 'package/manifest.json'], {
          encoding: 'utf8',
        }),
      );
      if (!manifest.application?.universalIdentifier) {
        throw new Error('Archive has no application universal identifier');
      }
      const destination = join(outputDirectory, archiveName);
      copyFileSync(archivePath, destination);
      archives.push(destination);
      console.log(`Verified bundled archive ${archiveName}`);
    } catch (error) {
      throw new Error(
        `Bundled application ${applicationName} failed: ${error.message}`,
        { cause: error },
      );
    }
  }

  return archives;
};

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    buildBundledApplications({
      rootDirectory: resolve(process.argv[2] ?? '/apps'),
      outputDirectory: process.argv[3] ? resolve(process.argv[3]) : undefined,
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
