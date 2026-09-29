import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  STARTER_PROJECT_TEMPLATES,
  findMissingStarterProjects,
  resolveMilestoneDueAt,
} from '../starter-projects.ts';

const STARTER_PROJECT_KEYS = [
  'LIV',
  'EVT',
  'SPR',
  'CNT',
  'REC',
  'ONB',
  'WEB',
  'SEM',
  'AGA',
  'SUB',
  'BUG',
  'OBJ',
];

test('the bundle ships the twelve starter projects', () => {
  assert.deepEqual(
    STARTER_PROJECT_TEMPLATES.map((starterProject) => starterProject.key),
    STARTER_PROJECT_KEYS,
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

test('the grant-application project names its Bilan link without requiring it', () => {
  const grantProject = STARTER_PROJECT_TEMPLATES.find(
    (starterProject) => starterProject.key === 'SUB',
  );

  assert.ok(grantProject);
  assert.match(grantProject.description, /Bilan/);
  assert.match(grantProject.description, /installe ni ne le requiert/);
});

for (const starterProject of STARTER_PROJECT_TEMPLATES) {
  test(`descriptor « ${starterProject.name} » is shaped and instantiable`, () => {
    assert.ok(starterProject.name.length > 0);
    assert.ok(starterProject.key.length > 0);
    assert.match(starterProject.key, /^[A-Z]{2,4}$/);
    assert.ok(starterProject.description.length > 0);
    assert.ok(starterProject.tasks.length >= 4);

    for (const starterTask of starterProject.tasks) {
      assert.ok(starterTask.title.length > 0);
      assert.ok(
        ['TODO', 'IN_PROGRESS', 'DONE'].includes(starterTask.projectStatus),
      );
    }

    for (const starterMilestone of starterProject.milestones) {
      assert.ok(starterMilestone.name.length > 0);
      assert.ok(Number.isFinite(starterMilestone.dueInDays));
    }
  });
}

test('only missing keys are returned as the install delta', () => {
  const missing = findMissingStarterProjects(['LIV']);

  assert.deepEqual(
    missing.map((starterProject) => starterProject.key),
    STARTER_PROJECT_KEYS.filter((key) => key !== 'LIV'),
  );
});

test('the install delta keys on the project key, never the name', () => {
  const [firstProject] = STARTER_PROJECT_TEMPLATES;

  const missing = findMissingStarterProjects([firstProject.name]);

  assert.equal(missing.length, STARTER_PROJECT_TEMPLATES.length);
});

test('nothing is missing when the bundle is fully present', () => {
  assert.deepEqual(findMissingStarterProjects(STARTER_PROJECT_KEYS), []);
});

test('milestone dates resolve day offsets against the install day', () => {
  const now = new Date('2026-09-14T12:00:00.000Z');

  assert.equal(resolveMilestoneDueAt(0, now), '2026-09-14T12:00:00.000Z');
  assert.equal(resolveMilestoneDueAt(-7, now), '2026-09-07T12:00:00.000Z');
  assert.equal(resolveMilestoneDueAt(30, now), '2026-10-14T12:00:00.000Z');
});

test('past-due milestones keep their negative offset (already-done checkpoints)', () => {
  const now = new Date('2026-03-01T00:00:00.000Z');

  // Month rollback across February (2026 is not a leap year).
  assert.equal(resolveMilestoneDueAt(-28, now), '2026-02-01T00:00:00.000Z');
});
