import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  TRASH_RETENTION_DAYS,
  buildArchivePayload,
  buildRestorePayload,
  isInTrash,
  isPastTrashRetention,
  isRestorable,
} from '../drive-trash-retention.ts';

const NOW = Date.parse('2026-09-17T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

test('the retention window is 7 days, shared by the UI and the cron', () => {
  assert.equal(TRASH_RETENTION_DAYS, 7);
});

test('a live record is not in the corbeille', () => {
  assert.equal(isInTrash(null), false);
  assert.equal(isInTrash(undefined), false);
  assert.equal(isInTrash(''), false);
  assert.equal(isInTrash('not-a-date'), false);
});

test('an archived record is in the corbeille', () => {
  assert.equal(isInTrash('2026-09-10T11:00:00.000Z'), true);
});

test('an archive older than 7 days is past retention', () => {
  assert.equal(isPastTrashRetention('2026-09-09T11:00:00.000Z', NOW), true);
});

test('an archive exactly at the boundary is not past retention', () => {
  assert.equal(
    isPastTrashRetention(new Date(NOW - 7 * DAY_MS).toISOString(), NOW),
    false,
  );
});

test('an unparsable or missing timestamp never purges', () => {
  assert.equal(isPastTrashRetention(null, NOW), false);
  assert.equal(isPastTrashRetention(undefined, NOW), false);
  assert.equal(isPastTrashRetention('', NOW), false);
  assert.equal(isPastTrashRetention('not-a-date', NOW), false);
});

test('a record is restorable only while archived inside the window', () => {
  assert.equal(isRestorable(new Date(NOW - DAY_MS).toISOString(), NOW), true);
  assert.equal(
    isRestorable(new Date(NOW - 8 * DAY_MS).toISOString(), NOW),
    false,
  );
  assert.equal(isRestorable(buildRestorePayload().archivedAt, NOW), false);
});

test('archiving stamps the timestamp and restoring clears it', () => {
  assert.deepEqual(buildArchivePayload(NOW), {
    archivedAt: '2026-09-17T12:00:00.000Z',
  });
  assert.deepEqual(buildRestorePayload(), { archivedAt: null });
});
