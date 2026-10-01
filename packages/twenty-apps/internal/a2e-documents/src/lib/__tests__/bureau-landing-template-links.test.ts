import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import {
  buildDocumentTemplateDescriptors,
  DOCUMENTS_TEMPLATE_CATEGORY,
} from '../document-template-descriptors.ts';

// M7f drift guard (US-150): the host Bureau landing features three starter
// templates by C1 key, but the keys and the descriptors live on opposite sides
// of the app/host boundary, so neither package can import the other. This spec
// reads the host constant and fails when a featured key no longer resolves to a
// shipped a2e-documents descriptor — a page-template rename would otherwise
// silently open the gallery on the wrong item (the soft preselect degrades,
// but the intent is lost).

const findRepositoryRoot = (): string => {
  let directory = import.meta.dirname;

  while (!existsSync(join(directory, 'packages', 'twenty-apps', 'internal'))) {
    const parentDirectory = dirname(directory);

    if (parentDirectory === directory) {
      throw new Error('Repository root with packages/twenty-apps not found');
    }

    directory = parentDirectory;
  }

  return directory;
};

const bureauLandingConstantsSource = readFileSync(
  join(
    findRepositoryRoot(),
    'packages',
    'twenty-front',
    'src',
    'modules',
    'bureau',
    'constants',
    'BureauLandingTemplates.ts',
  ),
  'utf8',
);

const featuredTemplateKeys = [
  ...bureauLandingConstantsSource.matchAll(/descriptorKey:\s*'([^']+)'/g),
].map((match) => match[1]);

test('the Bureau landing features exactly three starter templates', () => {
  assert.equal(featuredTemplateKeys.length, 3);
  assert.equal(new Set(featuredTemplateKeys).size, 3);
});

test('every featured Bureau landing key resolves to a shipped descriptor', () => {
  const descriptorsByKey = new Map(
    buildDocumentTemplateDescriptors().map((descriptor) => [
      descriptor.key,
      descriptor,
    ]),
  );

  for (const templateKey of featuredTemplateKeys) {
    const descriptor = descriptorsByKey.get(templateKey);

    assert.ok(
      descriptor,
      `the Bureau landing features an unknown a2e-documents template key: ${templateKey}`,
    );
    assert.equal(
      descriptor.category,
      DOCUMENTS_TEMPLATE_CATEGORY,
      `the featured template ${templateKey} is not a Bureau ("${DOCUMENTS_TEMPLATE_CATEGORY}") template`,
    );
  }
});
