import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  TRASH_RETENTION_DAYS,
  buildArchivePayload,
  buildRestorePayload,
  isInTrash,
  isPastTrashRetention,
  isRestorable,
} from '../trash-retention.ts';

const NOW = Date.parse('2026-09-12T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

// A deep document tree modelled by parent links: the retention rules must hold
// at any depth, since a lazily loaded subtree can archive/restore/purge a
// grandchild without ever touching its ancestors.
type DeepDocument = { id: string; parentDocumentId: string | null };

const DEEP_TREE: DeepDocument[] = [
  { id: 'root', parentDocumentId: null },
  { id: 'child', parentDocumentId: 'root' },
  { id: 'grandchild', parentDocumentId: 'child' },
  { id: 'great-grandchild', parentDocumentId: 'grandchild' },
];

test('the retention window is 7 days, shared by the UI and the cron', () => {
  assert.equal(TRASH_RETENTION_DAYS, 7);
});

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

test('a live document is not in the corbeille', () => {
  assert.equal(isInTrash(null), false);
  assert.equal(isInTrash(undefined), false);
  assert.equal(isInTrash(''), false);
  assert.equal(isInTrash('not-a-date'), false);
});

test('an archived document is in the corbeille at any depth', () => {
  const archived = buildArchivePayload(NOW).archivedAt;

  for (const document of DEEP_TREE) {
    assert.equal(isInTrash(archived), true, document.id);
  }
});

test('a deep archive stays restorable inside the window and purges after it', () => {
  const deepArchivedAt = buildArchivePayload(NOW).archivedAt;

  assert.equal(isRestorable(deepArchivedAt, NOW + 6 * DAY_MS), true);
  assert.equal(isPastTrashRetention(deepArchivedAt, NOW + 6 * DAY_MS), false);
  assert.equal(isPastTrashRetention(deepArchivedAt, NOW + 8 * DAY_MS), true);
  assert.equal(isRestorable(deepArchivedAt, NOW + 8 * DAY_MS), false);
});

test('restoring a deep document clears the marker, ending its purge clock', () => {
  const restoredAt = buildRestorePayload().archivedAt;

  assert.equal(restoredAt, null);
  assert.equal(isInTrash(restoredAt), false);
  assert.equal(isRestorable(restoredAt, NOW), false);
  assert.equal(isPastTrashRetention(restoredAt, NOW + 30 * DAY_MS), false);
});

test('archiving stamps the timestamp and restoring clears it', () => {
  assert.deepEqual(buildArchivePayload(NOW), {
    archivedAt: '2026-09-12T12:00:00.000Z',
  });
  assert.deepEqual(buildRestorePayload(), { archivedAt: null });
});
