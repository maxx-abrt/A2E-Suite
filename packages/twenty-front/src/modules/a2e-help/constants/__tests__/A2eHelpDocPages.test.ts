import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  A2E_HELP_DOC_PAGES,
  A2E_HELP_DOCS_BASE_URL,
  getA2eHelpDocUrl,
} from '@/a2e-help/constants/A2eHelpDocPages';

const BASE_STRUCTURE_PATH = join(
  __dirname,
  '../../../../../../twenty-docs/navigation/base-structure.json',
);

const readA2eSuiteSlugs = (): string[] => {
  const baseStructure = JSON.parse(
    readFileSync(BASE_STRUCTURE_PATH, 'utf8'),
  ) as { tabs: { groups: { key: string; pages?: unknown[] }[] }[] };

  for (const tab of baseStructure.tabs) {
    for (const group of tab.groups) {
      if (group.key !== 'a2eSuite') {
        continue;
      }

      return (group.pages ?? []).filter(
        (page): page is string => typeof page === 'string',
      );
    }
  }

  throw new Error('a2eSuite group not found in base-structure.json');
};

describe('A2eHelpDocPages', () => {
  it('links to the docs site canonical base without a trailing slash', () => {
    expect(A2E_HELP_DOCS_BASE_URL).toBe('https://docs.twenty.com');
    expect(getA2eHelpDocUrl('gettingStarted')).toBe(
      'https://docs.twenty.com/user-guide/a2e-suite/getting-started',
    );
  });

  it('every doc page slug exists in the twenty-docs navigation', () => {
    const a2eSuiteSlugs = readA2eSuiteSlugs();

    for (const docPage of Object.values(A2E_HELP_DOC_PAGES)) {
      expect(a2eSuiteSlugs).toContain(docPage.slug);
    }
  });
});
