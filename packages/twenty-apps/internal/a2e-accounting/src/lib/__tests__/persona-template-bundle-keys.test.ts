import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { buildFicheTemplateDescriptors } from '../fiche-template-descriptors.ts';

// M9d (US-120) drift guard: the workspace-preset definitions reference the same
// C1 gallery keys the gallery lists. Bilan owns both halves — its descriptor
// registry and the server preset constant — so this spec reads the server
// constant and fails when a referenced key no longer resolves to a shipped
// fiche descriptor (a renamed/removed template), which a copied key list would
// miss. The gated Bilan items are referenced through `blockedBundleContent`.

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

// A `blockedBundleContent(<APP_CONSTANT>, '<label>', '<blockedBy>'[, '<key>'])`
// call; the optional fourth argument is the referenced gallery key.
const BLOCKED_BUNDLE_CONTENT_CALL =
  /blockedBundleContent\(\s*(\w+),\s*'[^']*',\s*'[^']*'(?:\s*,\s*'([^']*)')?\s*,?\s*\)/g;

const referencedTemplateKeys = [
  ...serverSource.matchAll(BLOCKED_BUNDLE_CONTENT_CALL),
]
  .filter(
    ([, constantName]) =>
      universalIdentifierByConstantName.get(constantName) ===
      ownUniversalIdentifier,
  )
  .map(([, , templateKey]) => templateKey)
  .filter((templateKey): templateKey is string => templateKey !== undefined);

test('the presets reference at least one Bilan gallery key', () => {
  assert.ok(
    ownUniversalIdentifier,
    'the app universal identifier must be readable',
  );
  assert.ok(referencedTemplateKeys.length > 0);
});

test('every referenced Bilan key resolves to a shipped fiche descriptor', () => {
  const shippedKeys = new Set(
    buildFicheTemplateDescriptors().map((descriptor) => descriptor.key),
  );

  for (const templateKey of referencedTemplateKeys) {
    assert.ok(
      shippedKeys.has(templateKey),
      `a workspace preset references an unknown Bilan template key: ${templateKey}`,
    );
  }
});
