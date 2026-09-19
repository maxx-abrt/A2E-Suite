import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildStandupDigest,
  resolveDigestWindowStart,
  type DigestTaskRecord,
} from '../standup-digest.ts';

const NOW = new Date('2026-09-19T12:00:00.000Z');
const SINCE_ISO = '2026-09-18T00:00:00.000Z';

const ids = (tasks: DigestTaskRecord[]): string[] => tasks.map((task) => task.id);

test('the default window starts at the previous local day, not UTC', () => {
  const resolved = resolveDigestWindowStart(undefined, NOW);

  assert.equal(resolved.valid, true);

  if (!resolved.valid) {
    return;
  }

  const expected = new Date(NOW);

  expected.setDate(expected.getDate() - 1);
  expected.setHours(0, 0, 0, 0);

  assert.equal(new Date(resolved.sinceIso).getTime(), expected.getTime());
  assert.equal(new Date(resolved.sinceIso).getHours(), 0);
});

test('an explicit sinceIso is parsed and normalised', () => {
  const resolved = resolveDigestWindowStart('2026-09-18T06:30:00.000Z', NOW);

  assert.deepEqual(resolved, {
    valid: true,
    sinceIso: '2026-09-18T06:30:00.000Z',
  });
});

test('a blank, non-string or unparseable sinceIso is refused', () => {
  assert.deepEqual(resolveDigestWindowStart('   ', NOW), { valid: false });
  assert.deepEqual(resolveDigestWindowStart('not-a-date', NOW), { valid: false });
  assert.deepEqual(
    resolveDigestWindowStart(42 as unknown as string, NOW),
    { valid: false },
  );
});

test('tasks completed in the window are reported as completed', () => {
  const digest = buildStandupDigest({
    sinceIso: SINCE_ISO,
    now: NOW,
    tasks: [
      {
        id: 'done-in-window',
        projectStatus: 'DONE',
        updatedAt: '2026-09-19T09:00:00.000Z',
      },
      {
        id: 'done-before-window',
        projectStatus: 'DONE',
        updatedAt: '2026-09-17T09:00:00.000Z',
      },
    ],
  });

  assert.deepEqual(ids(digest.completed), ['done-in-window']);
});

test('completion falls back to the standard status when projectStatus is unset', () => {
  const digest = buildStandupDigest({
    sinceIso: SINCE_ISO,
    now: NOW,
    tasks: [
      {
        id: 'standard-done',
        projectStatus: null,
        status: 'DONE',
        updatedAt: '2026-09-19T09:00:00.000Z',
      },
    ],
  });

  assert.deepEqual(ids(digest.completed), ['standard-done']);
});

test('an unrecognised status is never treated as done', () => {
  const digest = buildStandupDigest({
    sinceIso: SINCE_ISO,
    now: NOW,
    tasks: [
      {
        id: 'unknown-status',
        projectStatus: 'BLOCKED',
        dueAt: '2026-09-18T00:00:00.000Z',
        updatedAt: '2026-09-19T09:00:00.000Z',
      },
    ],
  });

  assert.deepEqual(ids(digest.completed), []);
  assert.deepEqual(ids(digest.overdue), ['unknown-status']);
});

test('tasks created in the window are reported as created', () => {
  const digest = buildStandupDigest({
    sinceIso: SINCE_ISO,
    now: NOW,
    tasks: [
      {
        id: 'created-in-window',
        projectStatus: 'TODO',
        createdAt: '2026-09-19T07:00:00.000Z',
        updatedAt: '2026-09-19T07:00:00.000Z',
      },
      {
        id: 'created-before-window',
        projectStatus: 'TODO',
        createdAt: '2026-09-10T07:00:00.000Z',
        updatedAt: '2026-09-17T07:00:00.000Z',
      },
    ],
  });

  assert.deepEqual(ids(digest.created), ['created-in-window']);
  assert.deepEqual(ids(digest.updated), []);
});

test('an open task moved in the window is updated, not double-listed as created', () => {
  const digest = buildStandupDigest({
    sinceIso: SINCE_ISO,
    now: NOW,
    tasks: [
      {
        id: 'moved',
        projectStatus: 'IN_PROGRESS',
        createdAt: '2026-09-10T07:00:00.000Z',
        updatedAt: '2026-09-19T07:00:00.000Z',
      },
    ],
  });

  assert.deepEqual(ids(digest.updated), ['moved']);
  assert.deepEqual(ids(digest.created), []);
});

test('overdue classifies open tasks past due, excluding done and future ones', () => {
  const digest = buildStandupDigest({
    sinceIso: SINCE_ISO,
    now: NOW,
    tasks: [
      {
        id: 'overdue',
        projectStatus: 'TODO',
        dueAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-10T08:00:00.000Z',
      },
      {
        id: 'done-past-due',
        projectStatus: 'DONE',
        dueAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-10T08:00:00.000Z',
      },
      {
        id: 'future',
        projectStatus: 'TODO',
        dueAt: '2026-09-25T08:00:00.000Z',
        updatedAt: '2026-09-10T08:00:00.000Z',
      },
      {
        id: 'no-due-date',
        projectStatus: 'TODO',
        dueAt: null,
        updatedAt: '2026-09-10T08:00:00.000Z',
      },
    ],
  });

  assert.deepEqual(ids(digest.overdue), ['overdue']);
});

test('a task outside every window is reported nowhere', () => {
  const digest = buildStandupDigest({
    sinceIso: SINCE_ISO,
    now: NOW,
    tasks: [
      {
        id: 'old-open',
        projectStatus: 'TODO',
        dueAt: '2026-09-25T08:00:00.000Z',
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
      },
    ],
  });

  assert.deepEqual(digest.completed, []);
  assert.deepEqual(digest.created, []);
  assert.deepEqual(digest.updated, []);
  assert.deepEqual(digest.overdue, []);
});

test('a task created and finished in the window carries both facts', () => {
  const digest = buildStandupDigest({
    sinceIso: SINCE_ISO,
    now: NOW,
    tasks: [
      {
        id: 'same-day',
        projectStatus: 'DONE',
        createdAt: '2026-09-19T06:00:00.000Z',
        updatedAt: '2026-09-19T10:00:00.000Z',
      },
    ],
  });

  assert.deepEqual(ids(digest.created), ['same-day']);
  assert.deepEqual(ids(digest.completed), ['same-day']);
  assert.deepEqual(ids(digest.updated), []);
});

test('the digest echoes the resolved window and the projection fields', () => {
  const digest = buildStandupDigest({
    sinceIso: SINCE_ISO,
    now: NOW,
    tasks: [
      {
        id: 'task-1',
        title: 'Préparer le devis',
        projectStatus: 'DONE',
        dueAt: '2026-09-19T08:00:00.000Z',
        createdAt: '2026-09-18T06:00:00.000Z',
        updatedAt: '2026-09-19T09:00:00.000Z',
      },
    ],
  });

  assert.equal(digest.sinceIso, SINCE_ISO);
  assert.equal(digest.nowIso, NOW.toISOString());
  assert.deepEqual(digest.completed, [
    {
      id: 'task-1',
      title: 'Préparer le devis',
      dueAt: '2026-09-19T08:00:00.000Z',
      createdAt: '2026-09-18T06:00:00.000Z',
      updatedAt: '2026-09-19T09:00:00.000Z',
    },
  ]);
});
