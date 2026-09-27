import { existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';

import { ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS } from 'src/engine/core-modules/onboarding/constants/onboarding-installable-app-universal-identifiers';

// Drift guard for the onboarding "install apps" step (US-089). The front offers
// ONBOARDING_INSTALLABLE_APPS; the server's triggerInstallAppsOnboardingStep
// silently drops every selected identifier missing from its own allowlist.
// When the front grew the A2E apps (US-077, US-086) the server list kept only
// the three upstream apps, so every A2E selection was discarded without an
// error. The spec reads the real front constant and the real app sources
// instead of copying either list.

const findRepositoryRoot = (): string => {
  let directory = __dirname;

  while (!existsSync(join(directory, 'packages', 'twenty-apps', 'internal'))) {
    const parentDirectory = dirname(directory);

    if (parentDirectory === directory) {
      throw new Error('Repository root with packages/twenty-apps not found');
    }

    directory = parentDirectory;
  }

  return directory;
};

const repositoryRoot = findRepositoryRoot();

const readFrontOnboardingUniversalIdentifiers = (): string[] => {
  const source = readFileSync(
    join(
      repositoryRoot,
      'packages',
      'twenty-front',
      'src',
      'modules',
      'onboarding',
      'constants',
      'OnboardingInstallableApps.ts',
    ),
    'utf8',
  );

  return [...source.matchAll(/universalIdentifier:\s*'([0-9a-f-]{36})'/g)].map(
    (match) => match[1],
  );
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

const readFirstPartyAppUniversalIdentifiers = (): string[] => {
  const internalAppsDirectory = join(
    repositoryRoot,
    'packages',
    'twenty-apps',
    'internal',
  );

  return readdirSync(internalAppsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('a2e-'))
    .map((entry) =>
      readApplicationUniversalIdentifier(
        join(internalAppsDirectory, entry.name),
      ),
    );
};

describe('ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS', () => {
  it('lists each identifier once', () => {
    expect(new Set(ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS).size).toBe(
      ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS.length,
    );
  });

  it('accepts exactly the apps the front offers at onboarding', () => {
    const frontUniversalIdentifiers = readFrontOnboardingUniversalIdentifiers();

    expect(frontUniversalIdentifiers.length).toBeGreaterThan(0);
    expect(
      [...ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS].sort(),
    ).toEqual([...frontUniversalIdentifiers].sort());
  });

  it('accepts every first-party A2E app', () => {
    const firstPartyUniversalIdentifiers =
      readFirstPartyAppUniversalIdentifiers();

    expect(firstPartyUniversalIdentifiers.length).toBeGreaterThanOrEqual(6);

    for (const universalIdentifier of firstPartyUniversalIdentifiers) {
      expect(ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS).toContain(
        universalIdentifier,
      );
    }
  });
});
