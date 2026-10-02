import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

import { type MessageDescriptor } from '@lingui/core';

import { ONBOARDING_APP_CATALOGUE } from '@/onboarding/constants/OnboardingAppCatalogue';

// Truthfulness guard for the "Start from scratch" catalogue copy (M13b). The
// five D-N1 suite names must list exactly once, and each description must be
// the shipped per-app doc copy rather than a new promise invented in the
// onboarding flow. Reads the .mdx front matter, the same way the workspace
// template spec reads the server's real definitions.

const findRepositoryRoot = (): string => {
  let directory = process.cwd();

  while (!existsSync(join(directory, 'packages', 'twenty-server'))) {
    const parentDirectory = dirname(directory);

    if (parentDirectory === directory) {
      throw new Error('Repository root with packages/twenty-server not found');
    }

    directory = parentDirectory;
  }

  return directory;
};

const readDocDescription = (docKey: string): string => {
  const source = readFileSync(
    join(
      findRepositoryRoot(),
      'packages',
      'twenty-docs',
      'user-guide',
      'a2e-suite',
      `${docKey}.mdx`,
    ),
    'utf8',
  );

  const description = source.match(/^description:\s*(.+)$/m)?.[1]?.trim();

  if (description === undefined) {
    throw new Error(`No description front matter for ${docKey}.mdx`);
  }

  return description;
};

const readMessage = (descriptor: MessageDescriptor): string =>
  descriptor.message ?? descriptor.id;

describe('ONBOARDING_APP_CATALOGUE', () => {
  it('lists exactly the five D-N1 suite names, in order', () => {
    expect(
      ONBOARDING_APP_CATALOGUE.map((entry) => readMessage(entry.label)),
    ).toEqual(['Bureau', 'Agenda', 'Bilan', 'Syna', 'Archive']);
  });

  it.each(ONBOARDING_APP_CATALOGUE.map((entry) => [entry.key, entry] as const))(
    '%s reuses the shipped doc description verbatim',
    (key, entry) => {
      expect(readMessage(entry.description)).toBe(readDocDescription(key));
    },
  );
});
