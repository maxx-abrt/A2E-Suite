import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

import { checkDocuments, checkMarkdown } from './check-docs.mjs';

test('checks relative, encoded and angle-bracket paths, including image links', () => {
  const visited = [];
  const result = checkMarkdown(
    '[guide](../guide.md#section) [space](a%20b.md) ![image](<images/a (b).png>)',
    '/repo/docs/index.md',
    (path) => { visited.push(path); return true; },
  );

  assert.deepEqual(result, { errors: [], localLinks: 3 });
  assert.deepEqual(visited, [
    '/repo/guide.md', '/repo/docs/a b.md', '/repo/docs/images/a (b).png',
  ]);
});

test('reports missing paths and malformed encodings with line numbers', () => {
  const result = checkMarkdown('[missing](lost.md)\n[bad](%ZZ.md)', '/repo/a.md', () => false);
  assert.deepEqual(result, {
    localLinks: 2,
    errors: [
      '/repo/a.md:1: missing local target lost.md',
      '/repo/a.md:2: invalid local target %ZZ.md',
    ],
  });
});

test('ignores external URLs, anchors and examples inside code', () => {
  const result = checkMarkdown([
    '[web](https://example.com) [mail](mailto:test@example.com) [anchor](#here)',
    '[cdn](//example.com/image.png) `[example](missing.md)`',
    '```md', '[example](missing.md)', '```',
    '~~~md', '[example](missing.md)', '~~~',
  ].join('\n'), '/repo/a.md', () => { throw new Error('must not inspect external/code targets'); });
  assert.deepEqual(result, { errors: [], localLinks: 0 });
});

test('a longer fence can contain shorter or different fences', () => {
  const result = checkMarkdown('````md\n```\n~~~\n[example](missing.md)\n````', '/repo/a.md', () => false);
  assert.deepEqual(result, { errors: [], localLinks: 0 });
});

test('reports unclosed fences and does not close on an opening language tag', () => {
  const result = checkMarkdown('intro\n```md\n```js', '/repo/a.md');
  assert.deepEqual(result.errors, ['/repo/a.md:2: unclosed code fence']);
});

test('resolves actual files and directories, and fails for missing maintained documents', () => {
  const root = mkdtempSync(join(tmpdir(), 'a2e-docs-'));
  try {
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'README.md'), '[docs](docs/) [guide](docs/guide.md#start)');
    writeFileSync(join(root, 'docs/guide.md'), '# Start\n[home](../README.md)');

    assert.deepEqual(checkDocuments(root, ['README.md', 'docs/guide.md']), {
      errors: [], localLinks: 3, documents: 2,
    });

    writeFileSync(join(root, 'docs/guide.md'), '[missing](missing.md)');
    const result = checkDocuments(root, ['docs/guide.md', 'absent.md']);
    assert.deepEqual(result.errors, [
      `${resolve(root, 'docs/guide.md')}:1: missing local target missing.md`,
      'absent.md: cannot read maintained document',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
