import { existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';

import { A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS } from '@/a2e-workspace/constants/A2eSuiteApplicationUniversalIdentifiers';
import { ONBOARDING_INSTALLABLE_APPS } from '@/onboarding/constants/OnboardingInstallableApps';

// Drift guard for M1 (one-command provisioning): every first-party
// `packages/twenty-apps/internal/a2e-*` app must be (1) built into the
// production image by the Dockerfile `twenty-apps-build` stage, (2) listed in
// the A2E allowlist that drives Settings → Applications → A2E Suite and (3)
// offered by the onboarding app list. a2e-crm shipped without any of the three
// (US-086), so the check reads the real app sources instead of a copied list.

const findRepositoryRoot = (): string => {
  let directory = process.cwd();

  while (!existsSync(join(directory, 'packages', 'twenty-apps', 'internal'))) {
    const parentDirectory = dirname(directory);

    if (parentDirectory === directory) {
      throw new Error('Repository root with packages/twenty-apps not found');
    }

    directory = parentDirectory;
  }

  return directory;
};

const APPLICATION_UNIVERSAL_IDENTIFIER_PATTERN =
  /export const APPLICATION_UNIVERSAL_IDENTIFIER\s*=\s*'([0-9a-f-]{36})'/;

const readApplicationUniversalIdentifier = (appDirectory: string): string => {
  const candidateFiles = [
    join(appDirectory, 'src', 'application.config.ts'),
    join(appDirectory, 'src', 'constants', 'universal-identifiers.ts'),
  ];

  for (const candidateFile of candidateFiles) {
    if (!existsSync(candidateFile)) {
      continue;
    }

    const match = readFileSync(candidateFile, 'utf8').match(
      APPLICATION_UNIVERSAL_IDENTIFIER_PATTERN,
    );

    if (match !== null) {
      return match[1];
    }
  }

  throw new Error(`No APPLICATION_UNIVERSAL_IDENTIFIER in ${appDirectory}`);
};

const repositoryRoot = findRepositoryRoot();
const internalAppsDirectory = join(
  repositoryRoot,
  'packages',
  'twenty-apps',
  'internal',
);

const firstPartyApps = readdirSync(internalAppsDirectory, {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('a2e-'))
  .map((entry) => ({
    name: entry.name,
    universalIdentifier: readApplicationUniversalIdentifier(
      join(internalAppsDirectory, entry.name),
    ),
  }));

const dockerfile = readFileSync(
  join(repositoryRoot, 'packages', 'twenty-docker', 'twenty', 'Dockerfile'),
  'utf8',
);

const dockerfileBuildLoopApps =
  dockerfile
    .match(/for app in ([^;]+);/)?.[1]
    .trim()
    .split(/\s+/) ?? [];

describe('A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS', () => {
  it('discovers the six first-party A2E apps', () => {
    expect(firstPartyApps.map((app) => app.name).sort()).toEqual([
      'a2e-accounting',
      'a2e-chat',
      'a2e-crm',
      'a2e-documents',
      'a2e-drive',
      'a2e-projects',
    ]);
  });

  it('lists every first-party app exactly once', () => {
    expect(new Set(A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS).size).toBe(
      A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS.length,
    );

    for (const app of firstPartyApps) {
      expect(A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS).toContain(
        app.universalIdentifier,
      );
    }

    expect(A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS).toHaveLength(
      firstPartyApps.length,
    );
  });

  it('offers every first-party app in the onboarding app list', () => {
    const onboardingUniversalIdentifiers = ONBOARDING_INSTALLABLE_APPS.map(
      (app) => app.universalIdentifier,
    );

    for (const app of firstPartyApps) {
      expect(onboardingUniversalIdentifiers).toContain(app.universalIdentifier);
    }
  });

  it('builds every first-party app into the production image', () => {
    for (const app of firstPartyApps) {
      expect(dockerfile).toContain(
        `COPY ./packages/twenty-apps/internal/${app.name} `,
      );
      expect(dockerfileBuildLoopApps).toContain(app.name);
    }
  });
});
