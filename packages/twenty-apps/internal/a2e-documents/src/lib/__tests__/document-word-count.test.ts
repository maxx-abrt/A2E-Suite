import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  countDocumentCharacters,
  countDocumentWords,
} from '../document-word-count.ts';

test('counts prose words', () => {
  assert.equal(countDocumentWords('Bonjour le monde'), 3);
});

test('ignores markdown syntax and link targets', () => {
  const markdown =
    '# Titre\n\n- premier point\n- second point\n\nVoir [la doc](https://example.com) ici.';

  assert.equal(countDocumentWords(markdown), 9);
});

test('keeps words inside fenced code blocks but drops the fence markers', () => {
  const markdown = '```ts\nconst value = 1;\n```';

  assert.equal(countDocumentWords(markdown), 3);
});

test('counts accented and numeric tokens', () => {
  assert.equal(countDocumentWords('café été 2026'), 3);
});

test('returns zero for empty or absent markdown', () => {
  assert.equal(countDocumentWords(null), 0);
  assert.equal(countDocumentWords(undefined), 0);
  assert.equal(countDocumentWords(''), 0);
});

test('character count ignores block syntax but keeps content', () => {
  assert.equal(countDocumentCharacters('# Titre\n\ncorps'), 'Titre\ncorps'.length);
  assert.equal(countDocumentCharacters(null), 0);
});
