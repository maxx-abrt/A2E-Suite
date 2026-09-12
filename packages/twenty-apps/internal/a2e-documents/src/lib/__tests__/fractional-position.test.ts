import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAppendPosition,
  generateFractionalIndexBetween,
} from '../fractional-position.ts';

test('an empty tree yields the canonical first position', () => {
  assert.equal(generateFractionalIndexBetween({}), 'a0');
});

test('appending after the last sibling never renumbers it', () => {
  assert.equal(generateFractionalIndexBetween({ previous: 'a0' }), 'a1');
  assert.equal(generateFractionalIndexBetween({ previous: 'a1' }), 'a2');
  assert.equal(generateFractionalIndexBetween({ previous: 'aG' }), 'aH');
});

test('prepending before the first sibling sorts before it', () => {
  const position = generateFractionalIndexBetween({ next: 'a0' });

  assert.ok(position < 'a0');
});

test('interleaving between two siblings sorts between them', () => {
  const position = generateFractionalIndexBetween({
    previous: 'a1',
    next: 'a2',
  });

  assert.ok('a1' < position && position < 'a2');
});

test('3000 sequential appends stay short and strictly ascending', () => {
  let previous: string | undefined;
  let longest = 0;

  for (let index = 0; index < 3000; index++) {
    const position = generateFractionalIndexBetween({ previous });

    assert.ok(previous === undefined || previous < position);
    longest = Math.max(longest, position.length);
    previous = position;
  }

  assert.ok(longest <= 8, `longest key was ${longest}`);
});

test('buildAppendPosition continues the sibling list', () => {
  assert.equal(buildAppendPosition('a0'), 'a1');
  assert.equal(buildAppendPosition(null), 'a0');
  assert.equal(buildAppendPosition(undefined), 'a0');
});

test('inverted bounds throw', () => {
  assert.throws(() =>
    generateFractionalIndexBetween({ previous: 'b', next: 'a' }),
  );
});
