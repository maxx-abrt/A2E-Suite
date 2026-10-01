import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import {
  ARCHIVE_TEMPLATE_CATEGORY,
  buildFolderStructureDescriptors,
} from '../folder-structure-descriptors.ts';

// M7f drift guard (US-153): the host Archive landing features three
// folder-structure templates by C1 key, but the keys and the descriptors live
// on opposite sides of the app/host boundary, so neither package can import the
// other. This spec reads the host constant and fails when a featured key no
// longer resolves to a shipped a2e-drive descriptor — a folder-structure rename
// would otherwise silently open the gallery on the wrong item (the soft
// preselect degrades, but the intent is lost).

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

const archiveLandingConstantsSource = readFileSync(
  join(
    findRepositoryRoot(),
    'packages',
    'twenty-front',
    'src',
    'modules',
    'drive',
    'constants',
    'ArchiveLandingTemplates.ts',
  ),
  'utf8',
);

const featuredTemplateKeys = [
  ...archiveLandingConstantsSource.matchAll(/descriptorKey:\s*'([^']+)'/g),
].map((match) => match[1]);

test('the Archive landing features exactly three starter templates', () => {
  assert.equal(featuredTemplateKeys.length, 3);
  assert.equal(new Set(featuredTemplateKeys).size, 3);
});

test('every featured Archive landing key resolves to a shipped descriptor', () => {
  const descriptorsByKey = new Map(
    buildFolderStructureDescriptors().map((descriptor) => [
      descriptor.key,
      descriptor,
    ]),
  );

  for (const templateKey of featuredTemplateKeys) {
    const descriptor = descriptorsByKey.get(templateKey);

    assert.ok(
      descriptor,
      `the Archive landing features an unknown a2e-drive template key: ${templateKey}`,
    );
    assert.equal(
      descriptor.category,
      ARCHIVE_TEMPLATE_CATEGORY,
      `the featured template ${templateKey} is not an Archive ("${ARCHIVE_TEMPLATE_CATEGORY}") template`,
    );
  }
});
