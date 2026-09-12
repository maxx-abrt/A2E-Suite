import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isPastTrashRetention } from '../trash-retention.ts';

const NOW = Date.parse('2026-09-12T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

test('an archive older than 7 days is past retention', () => {
  assert.equal(isPastTrashRetention('2026-09-05T11:00:00.000Z', NOW), true);
});

test('an archive exactly at the boundary is not past retention', () => {
  assert.equal(
    isPastTrashRetention(new Date(NOW - 7 * DAY_MS).toISOString(), NOW),
    false,
  );
});

test('a recent archive is kept', () => {
  assert.equal(
    isPastTrashRetention(new Date(NOW - DAY_MS).toISOString(), NOW),
    false,
  );
});

test('a missing or empty timestamp never purges', () => {
  assert.equal(isPastTrashRetention(null, NOW), false);
  assert.equal(isPastTrashRetention(undefined, NOW), false);
  assert.equal(isPastTrashRetention('', NOW), false);
});

test('an unparsable timestamp never purges', () => {
  assert.equal(isPastTrashRetention('not-a-date', NOW), false);
});
