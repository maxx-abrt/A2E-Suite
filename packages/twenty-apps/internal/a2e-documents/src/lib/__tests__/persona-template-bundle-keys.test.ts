import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { buildDocumentTemplateDescriptors } from '../document-template-descriptors.ts';

// M9d (US-120) drift guard: the workspace-preset definitions reference the same
// C1 gallery keys the gallery lists. Documents owns both halves — its
// descriptor registry and the server preset constant — so this spec reads the
// server constant and fails when a referenced key no longer resolves to a
// shipped descriptor (a renamed/removed template), which a copied key list
// would miss.

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

const serverSource = readFileSync(
  join(
    findRepositoryRoot(),
    'packages',
    'twenty-server',
    'src',
    'engine',
    'core-modules',
    'onboarding',
    'constants',
    'workspace-template-definitions.constant.ts',
  ),
  'utf8',
);

const ownUniversalIdentifier = readFileSync(
  join(import.meta.dirname, '..', '..', 'application.config.ts'),
  'utf8',
).match(/APPLICATION_UNIVERSAL_IDENTIFIER\s*=\s*'([0-9a-f-]{36})'/)?.[1];

const universalIdentifierByConstantName = new Map(
  [...serverSource.matchAll(/const (\w+) =\s*'([0-9a-f-]{36})'/g)].map(
    (match) => [match[1], match[2]] as const,
  ),
);

// A `bundleContent(<APP_CONSTANT>, '<label>'[, '<templateKey>'])` call; the
// optional third argument is the referenced gallery key. It never matches
// `blockedBundleContent(` (capital B) so each app extracts only its own calls.
const BUNDLE_CONTENT_CALL =
  /bundleContent\(\s*(\w+),\s*'[^']*'(?:\s*,\s*'([^']*)')?\s*,?\s*\)/g;

const referencedTemplateKeys = [...serverSource.matchAll(BUNDLE_CONTENT_CALL)]
  .filter(
    ([, constantName]) =>
      universalIdentifierByConstantName.get(constantName) ===
      ownUniversalIdentifier,
  )
  .map(([, , templateKey]) => templateKey)
  .filter((templateKey): templateKey is string => templateKey !== undefined);

test('the presets reference at least one Bureau gallery key', () => {
  assert.ok(
    ownUniversalIdentifier,
    'the app universal identifier must be readable',
  );
  assert.ok(referencedTemplateKeys.length > 0);
});

test('every referenced Bureau key resolves to a shipped descriptor', () => {
  const shippedKeys = new Set(
    buildDocumentTemplateDescriptors().map((descriptor) => descriptor.key),
  );

  for (const templateKey of referencedTemplateKeys) {
    assert.ok(
      shippedKeys.has(templateKey),
      `a workspace preset references an unknown Bureau template key: ${templateKey}`,
    );
  }
});
