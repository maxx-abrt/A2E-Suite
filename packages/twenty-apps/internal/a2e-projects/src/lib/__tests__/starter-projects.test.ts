import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  STARTER_PROJECT_TEMPLATES,
  findMissingStarterProjects,
  resolveMilestoneDueAt,
} from '../starter-projects.ts';

test('the bundle ships the two starter projects', () => {
  assert.deepEqual(
    STARTER_PROJECT_TEMPLATES.map((starterProject) => starterProject.key),
    ['LIV', 'EVT'],
  );
});

test('every starter project carries a unique key, tasks and milestones', () => {
  const keys = new Set(
    STARTER_PROJECT_TEMPLATES.map((starterProject) => starterProject.key),
  );

  assert.equal(keys.size, STARTER_PROJECT_TEMPLATES.length);

  for (const starterProject of STARTER_PROJECT_TEMPLATES) {
    assert.ok(starterProject.name.length > 0);
    assert.ok(starterProject.tasks.length > 0);
    assert.ok(starterProject.milestones.length > 0);
  }
});

test('only missing keys are returned as the install delta', () => {
  const missing = findMissingStarterProjects(['LIV']);

  assert.deepEqual(
    missing.map((starterProject) => starterProject.key),
    ['EVT'],
  );
});

test('nothing is missing when the bundle is fully present', () => {
  const allKeys = STARTER_PROJECT_TEMPLATES.map(
    (starterProject) => starterProject.key,
  );

  assert.deepEqual(findMissingStarterProjects(allKeys), []);
});

test('milestone dates resolve day offsets against the install day', () => {
  const now = new Date('2026-09-14T12:00:00.000Z');

  assert.equal(
    resolveMilestoneDueAt(0, now),
    '2026-09-14T12:00:00.000Z',
  );
  assert.equal(
    resolveMilestoneDueAt(-7, now),
    '2026-09-07T12:00:00.000Z',
  );
  assert.equal(
    resolveMilestoneDueAt(30, now),
    '2026-10-14T12:00:00.000Z',
  );
});

test('past-due milestones keep their negative offset (already-done checkpoints)', () => {
  const now = new Date('2026-03-01T00:00:00.000Z');

  // Month rollback across February (2026 is not a leap year).
  assert.equal(
    resolveMilestoneDueAt(-28, now),
    '2026-02-01T00:00:00.000Z',
  );
});
