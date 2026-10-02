import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// M13e drift guard (US-168): every Cmd+K command this app registers must read
// "<App> : <canonical verb> …" so the suite speaks one language with one verb
// per concept. The configs are ts modules the manifest builder reads and no
// typed registry owns them, so a grep over the source is the only place the
// contract can be asserted for every file — including one no other test
// imports.
const APP_PREFIX = 'Bilan';
// French style: the verb stays lowercase after the "<App> :" prefix but is
// capitalized at the start of the unprefixed shortLabel.
const CANONICAL_VERBS = ['créer', 'ouvrir', 'partager'];
const CAPITALIZED_VERBS = CANONICAL_VERBS.map(
  (verb) => `${verb[0].toUpperCase()}${verb.slice(1)}`,
);
const LABEL_PATTERN = new RegExp(
  `^${APP_PREFIX} : (${CANONICAL_VERBS.join('|')}) \\S`,
);
const SHORT_LABEL_PATTERN = new RegExp(
  `^(${CAPITALIZED_VERBS.join('|')}) \\S`,
);

const commandMenuDirectory = join(
  import.meta.dirname,
  '..',
  '..',
  'command-menu-items',
);

const commandMenuSources = readdirSync(commandMenuDirectory)
  .filter((fileName) => fileName.endsWith('.command-menu-item.ts'))
  .map((fileName) => ({
    fileName,
    source: readFileSync(join(commandMenuDirectory, fileName), 'utf8'),
  }));

const readStringField = (source: string, field: string): string =>
  source.match(new RegExp(`\\b${field}:\\s*'([^']*)'`))?.[1] ?? '';

test('every command-menu label follows "<App> : <verb> …"', () => {
  assert.ok(commandMenuSources.length > 0, 'no command-menu-items found');

  for (const { fileName, source } of commandMenuSources) {
    const label = readStringField(source, 'label');

    assert.match(label, LABEL_PATTERN, `${fileName} label: "${label}"`);
  }
});

test('every command-menu shortLabel starts with a canonical verb', () => {
  for (const { fileName, source } of commandMenuSources) {
    const shortLabel = readStringField(source, 'shortLabel');

    assert.match(
      shortLabel,
      SHORT_LABEL_PATTERN,
      `${fileName} shortLabel: "${shortLabel}"`,
    );
  }
});
