import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractOutline } from '../document-outline.ts';

test('extracts headings with their level', () => {
  const markdown = '# Titre\n\ntexte\n\n## Section\n\n### Sous-section';

  assert.deepEqual(extractOutline(markdown), [
    { level: 1, text: 'Titre' },
    { level: 2, text: 'Section' },
    { level: 3, text: 'Sous-section' },
  ]);
});

test('ignores headings inside fenced code blocks', () => {
  const markdown =
    '# Vrai titre\n\n```md\n# pas un titre\n## non plus\n```\n\n## Second titre';

  assert.deepEqual(extractOutline(markdown), [
    { level: 1, text: 'Vrai titre' },
    { level: 2, text: 'Second titre' },
  ]);
});

test('handles unbalanced fences without throwing', () => {
  const markdown = '# Avant\n\n```\n# dans le fence';

  assert.deepEqual(extractOutline(markdown), [{ level: 1, text: 'Avant' }]);
});

test('trims closing hashes and surrounding whitespace', () => {
  const markdown = '##  Liste  ##';

  assert.deepEqual(extractOutline(markdown), [{ level: 2, text: 'Liste' }]);
});

test('returns an empty outline for empty or absent markdown', () => {
  assert.deepEqual(extractOutline(null), []);
  assert.deepEqual(extractOutline(undefined), []);
  assert.deepEqual(extractOutline('juste du texte'), []);
});
