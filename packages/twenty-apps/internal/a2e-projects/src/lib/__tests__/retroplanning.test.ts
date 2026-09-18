import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_RETROPLANNING_TIME,
  RETROPLANNING_RECIPES,
  buildRetroplanningPreview,
  buildRetroplanningProvenanceValue,
  computeRetroplanningProvenance,
  findRetroplanningRecipe,
  orderRetroplanningTasksByParentDepth,
  parseRetroplanningProvenanceValue,
  readRetroplanningTaskKey,
  reconcileRetroplanningDraft,
  type RetroplanningExistingTask,
  type RetroplanningPlannedTask,
  type RetroplanningRecipe,
} from '../retroplanning.ts';

// The retroplanning engine is pure and clock/timezone injectable, so every
// assertion below pins an instant. Keeping the schedule deterministic is what
// lets the same preview drive both the UI and the idempotent write path.

const deliveryRecipe = (): RetroplanningRecipe => {
  const recipe = findRetroplanningRecipe('delivery');

  assert.ok(recipe, 'the delivery recipe must exist');

  return recipe;
};

const findByKey = (
  tasks: RetroplanningPlannedTask[],
  key: string,
): RetroplanningPlannedTask => {
  const match = tasks.find((task) => task.key === key);

  assert.ok(match, `planned task ${key} missing`);

  return match;
};

const ownedTask = (
  planned: RetroplanningPlannedTask,
  overrides: Partial<RetroplanningExistingTask> = {},
): RetroplanningExistingTask => ({
  id: `id-${planned.key}`,
  title: planned.title,
  dueAt: planned.dueAt,
  projectStatus: planned.projectStatus,
  provenance: buildRetroplanningProvenanceValue(
    planned.provenance,
    planned.dueAt,
  ),
  ...overrides,
});

test('a preview schedules every task backwards from the deadline', () => {
  const preview = buildRetroplanningPreview(
    deliveryRecipe(),
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );

  assert.equal(preview.projectDeadlineAt, '2026-10-01T16:00:00.000Z');
  assert.equal(preview.tasks.length, 7);

  const release = findByKey(preview.tasks, 'release');

  assert.equal(release.startAt, '2026-10-01T16:00:00.000Z');
  assert.equal(release.dueAt, '2026-10-01T16:00:00.000Z');
  assert.equal(release.provenance, 'delivery@v1:release');

  const build = findByKey(preview.tasks, 'build');

  assert.equal(build.startAt, '2026-09-19T16:00:00.000Z');
  assert.equal(build.dueAt, '2026-09-27T16:00:00.000Z');

  const scope = findByKey(preview.tasks, 'scope');

  assert.equal(scope.startAt, '2026-09-07T16:00:00.000Z');
  assert.equal(scope.dueAt, '2026-09-09T16:00:00.000Z');
  assert.equal(scope.projectStatus, 'DONE');
});

test('dependencies order the chain and subtasks keep their parent key', () => {
  const preview = buildRetroplanningPreview(
    deliveryRecipe(),
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );

  assert.deepEqual(findByKey(preview.tasks, 'brief').dependsOn, ['scope']);
  assert.deepEqual(findByKey(preview.tasks, 'build').dependsOn, ['build-ui']);
  assert.deepEqual(findByKey(preview.tasks, 'build-ui').dependsOn, [
    'build-api',
  ]);

  const buildApi = findByKey(preview.tasks, 'build-api');
  const buildUi = findByKey(preview.tasks, 'build-ui');

  assert.equal(buildApi.parentKey, 'build');
  assert.equal(buildUi.parentKey, 'build');

  // The subtasks finish before their parent starts.
  assert.ok(
    new Date(buildUi.dueAt).getTime() <
      new Date(findByKey(preview.tasks, 'build').startAt).getTime(),
  );
});

test('the named timezone decides the deadline instant, not a fixed offset', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const parisSummer = buildRetroplanningPreview(
    deliveryRecipe(),
    { date: '2026-07-01', timezone: 'Europe/Paris' },
    now,
  );
  const parisWinter = buildRetroplanningPreview(
    deliveryRecipe(),
    { date: '2026-01-15', timezone: 'Europe/Paris' },
    now,
  );
  const utc = buildRetroplanningPreview(
    deliveryRecipe(),
    { date: '2026-07-01', time: '09:30', timezone: 'UTC' },
    now,
  );

  assert.equal(parisSummer.projectDeadlineAt, '2026-07-01T16:00:00.000Z');
  assert.equal(parisWinter.projectDeadlineAt, '2026-01-15T17:00:00.000Z');
  assert.equal(utc.projectDeadlineAt, '2026-07-01T09:30:00.000Z');
  assert.equal(DEFAULT_RETROPLANNING_TIME, '18:00');
});

test('a deadline too close to now raises a past-date warning', () => {
  const preview = buildRetroplanningPreview(
    deliveryRecipe(),
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-10-15T00:00:00.000Z'),
  );

  const pastDateWarnings = preview.warnings.filter(
    (warning) => warning.code === 'PAST_DATE',
  );

  assert.equal(pastDateWarnings.length, preview.tasks.length);
  assert.deepEqual(pastDateWarnings[0]?.taskKeys, ['scope']);
});

test('two tasks sharing an assignee role raise an overlap warning', () => {
  const recipe: RetroplanningRecipe = {
    key: 'overlap',
    version: 1,
    label: 'Chevauchement',
    description: 'Deux tâches sur le même rôle.',
    tasks: [
      {
        key: 'first',
        title: 'Première',
        durationDays: 5,
        assigneeRole: 'lead',
      },
      {
        key: 'second',
        title: 'Seconde',
        durationDays: 5,
        assigneeRole: 'lead',
      },
    ],
  };
  const preview = buildRetroplanningPreview(
    recipe,
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );

  const overlaps = preview.warnings.filter(
    (warning) => warning.code === 'ASSIGNEE_OVERLAP',
  );

  assert.equal(overlaps.length, 1);
  assert.deepEqual(overlaps[0]?.taskKeys, ['first', 'second']);
});

test('provenance round-trips the recipe identity and generated due date', () => {
  const recipe = deliveryRecipe();
  const provenance = computeRetroplanningProvenance(recipe, 'release');
  const dueAt = '2026-10-01T16:00:00.000Z';
  const value = buildRetroplanningProvenanceValue(provenance, dueAt);

  assert.equal(provenance, 'delivery@v1:release');
  assert.equal(value, 'delivery@v1:release#2026-10-01T16:00:00.000Z');
  assert.deepEqual(parseRetroplanningProvenanceValue(value), {
    provenance,
    generatedDueAt: dueAt,
  });
  assert.equal(readRetroplanningTaskKey(provenance), 'release');
  assert.equal(
    parseRetroplanningProvenanceValue('not-a-provenance'),
    undefined,
  );
});

test('a first generation creates every planned task and touches nothing else', () => {
  const recipe = deliveryRecipe();
  const preview = buildRetroplanningPreview(
    recipe,
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );
  const changeSet = reconcileRetroplanningDraft(recipe, preview.tasks, [], {
    mode: 'APPEND',
    confirmedDestructiveChange: false,
  });

  assert.equal(changeSet.create.length, preview.tasks.length);
  assert.deepEqual(changeSet.update, []);
  assert.deepEqual(changeSet.remove, []);
  assert.deepEqual(changeSet.protected, []);
  assert.equal(changeSet.requiresDestructiveConfirmation, false);
});

test('replaying the same preview is a no-op', () => {
  const recipe = deliveryRecipe();
  const preview = buildRetroplanningPreview(
    recipe,
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );
  const existing = preview.tasks.map((planned) => ownedTask(planned));
  const changeSet = reconcileRetroplanningDraft(
    recipe,
    preview.tasks,
    existing,
    {
      mode: 'APPEND',
      confirmedDestructiveChange: false,
    },
  );

  assert.deepEqual(changeSet.create, []);
  assert.deepEqual(changeSet.update, []);
  // The recipe seeds `scope` as DONE, so replaying it protects that finished
  // task rather than rewriting it.
  assert.deepEqual(changeSet.protected, [
    { id: 'id-scope', key: 'scope', reason: 'COMPLETED' },
  ]);
});

test('moving the deadline updates only the tasks the recipe owns', () => {
  const recipe = deliveryRecipe();
  const oldPreview = buildRetroplanningPreview(
    recipe,
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );
  const newPreview = buildRetroplanningPreview(
    recipe,
    { date: '2026-10-08', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );
  const existing = oldPreview.tasks.map((planned) => ownedTask(planned));
  const changeSet = reconcileRetroplanningDraft(
    recipe,
    newPreview.tasks,
    existing,
    {
      mode: 'APPEND',
      confirmedDestructiveChange: false,
    },
  );

  assert.deepEqual(changeSet.create, []);
  assert.equal(changeSet.update.length, newPreview.tasks.length - 1);
  assert.deepEqual(changeSet.protected, [
    { id: 'id-scope', key: 'scope', reason: 'COMPLETED' },
  ]);

  const releaseUpdate = changeSet.update.find(
    (update) => update.key === 'release',
  );

  assert.equal(releaseUpdate?.dueAt, '2026-10-08T16:00:00.000Z');
  // The persisted provenance embeds the new date so the next replan still
  // recognizes the row as owned instead of mistaking it for a manual edit.
  assert.equal(
    releaseUpdate?.provenance,
    'delivery@v1:release#2026-10-08T16:00:00.000Z',
  );
});

test('a manually edited date and completed work are protected from replanning', () => {
  const recipe = deliveryRecipe();
  const preview = buildRetroplanningPreview(
    recipe,
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );
  const movedPreview = buildRetroplanningPreview(
    recipe,
    { date: '2026-10-08', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );
  const existing = preview.tasks.map((planned) =>
    planned.key === 'release'
      ? ownedTask(planned, { dueAt: '2026-09-29T16:00:00.000Z' })
      : planned.key === 'review'
        ? ownedTask(planned, { projectStatus: 'DONE' })
        : ownedTask(planned),
  );
  const changeSet = reconcileRetroplanningDraft(
    recipe,
    movedPreview.tasks,
    existing,
    {
      mode: 'REPLACE',
      confirmedDestructiveChange: true,
    },
  );

  const protectedReasons = changeSet.protected.map(
    (entry) => `${entry.key}:${entry.reason}`,
  );

  assert.deepEqual(protectedReasons.sort(), [
    'release:MANUALLY_EDITED',
    'review:COMPLETED',
    'scope:COMPLETED',
  ]);
  assert.equal(
    changeSet.update.some(
      (update) => update.key === 'release' || update.key === 'review',
    ),
    false,
  );
});

test('REPLACE only removes stale owned tasks once destruction is confirmed', () => {
  const recipe = deliveryRecipe();
  const preview = buildRetroplanningPreview(
    recipe,
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );
  const stale: RetroplanningExistingTask = {
    id: 'stale-1',
    title: 'Ancienne tâche',
    dueAt: '2026-09-20T16:00:00.000Z',
    projectStatus: 'TODO',
    provenance: 'delivery@v1:removed-slot#2026-09-20T16:00:00.000Z',
  };
  const existing = [
    ...preview.tasks.map((planned) => ownedTask(planned)),
    stale,
  ];

  const append = reconcileRetroplanningDraft(recipe, preview.tasks, existing, {
    mode: 'APPEND',
    confirmedDestructiveChange: false,
  });
  const unconfirmedReplace = reconcileRetroplanningDraft(
    recipe,
    preview.tasks,
    existing,
    {
      mode: 'REPLACE',
      confirmedDestructiveChange: false,
    },
  );
  const confirmedReplace = reconcileRetroplanningDraft(
    recipe,
    preview.tasks,
    existing,
    {
      mode: 'REPLACE',
      confirmedDestructiveChange: true,
    },
  );

  assert.deepEqual(append.remove, []);
  assert.equal(append.requiresDestructiveConfirmation, false);
  assert.deepEqual(unconfirmedReplace.remove, []);
  assert.equal(unconfirmedReplace.requiresDestructiveConfirmation, true);
  assert.deepEqual(confirmedReplace.remove, ['stale-1']);
  assert.equal(confirmedReplace.requiresDestructiveConfirmation, false);
});

test('tasks from another recipe or without provenance are never touched', () => {
  const recipe = deliveryRecipe();
  const preview = buildRetroplanningPreview(
    recipe,
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    new Date('2026-09-01T00:00:00.000Z'),
  );
  const foreign: RetroplanningExistingTask[] = [
    {
      id: 'manual-1',
      title: 'Tâche manuelle',
      dueAt: '2026-09-10T16:00:00.000Z',
      projectStatus: 'TODO',
      provenance: null,
    },
    {
      id: 'other-recipe',
      title: 'Autre recette',
      dueAt: '2026-09-11T16:00:00.000Z',
      projectStatus: 'TODO',
      provenance: 'event@v1:venue#2026-09-11T16:00:00.000Z',
    },
  ];
  const changeSet = reconcileRetroplanningDraft(
    recipe,
    preview.tasks,
    foreign,
    {
      mode: 'REPLACE',
      confirmedDestructiveChange: true,
    },
  );

  assert.equal(changeSet.create.length, preview.tasks.length);
  assert.deepEqual(changeSet.remove, []);
  assert.deepEqual(changeSet.protected, []);
});

test('parents are ordered before their subtasks for creation', () => {
  const tasks = [
    { key: 'child', parentKey: 'parent' },
    { key: 'parent' },
    { key: 'grandchild', parentKey: 'child' },
  ];
  const ordered = orderRetroplanningTasksByParentDepth(tasks);

  assert.deepEqual(
    ordered.map((task) => task.key),
    ['parent', 'child', 'grandchild'],
  );
});

test('a malformed recipe is rejected instead of scheduled', () => {
  const deadline = { date: '2026-10-01', timezone: 'UTC' };
  const now = new Date('2026-09-01T00:00:00.000Z');

  const cyclic: RetroplanningRecipe = {
    key: 'cyclic',
    version: 1,
    label: 'Cycle',
    description: 'Cycle',
    tasks: [
      { key: 'a', title: 'A', durationDays: 1, dependsOn: ['b'] },
      { key: 'b', title: 'B', durationDays: 1, dependsOn: ['a'] },
    ],
  };
  const unknownDependency: RetroplanningRecipe = {
    key: 'unknown',
    version: 1,
    label: 'Inconnue',
    description: 'Inconnue',
    tasks: [{ key: 'a', title: 'A', durationDays: 1, dependsOn: ['missing'] }],
  };
  const duplicateKey: RetroplanningRecipe = {
    key: 'duplicate',
    version: 1,
    label: 'Doublon',
    description: 'Doublon',
    tasks: [
      { key: 'a', title: 'A', durationDays: 1 },
      { key: 'a', title: 'A bis', durationDays: 1 },
    ],
  };
  const zeroDuration: RetroplanningRecipe = {
    key: 'zero',
    version: 1,
    label: 'Zéro',
    description: 'Zéro',
    tasks: [{ key: 'a', title: 'A', durationDays: 0 }],
  };

  assert.throws(
    () => buildRetroplanningPreview(cyclic, deadline, now),
    /cycliques/,
  );
  assert.throws(
    () => buildRetroplanningPreview(unknownDependency, deadline, now),
    /n’existe pas/,
  );
  assert.throws(
    () => buildRetroplanningPreview(duplicateKey, deadline, now),
    /dupliquée/,
  );
  assert.throws(
    () => buildRetroplanningPreview(zeroDuration, deadline, now),
    /durée/,
  );
});

test('an invalid deadline or timezone is refused', () => {
  const recipe = deliveryRecipe();
  const now = new Date('2026-09-01T00:00:00.000Z');

  assert.throws(
    () =>
      buildRetroplanningPreview(
        recipe,
        { date: '2026-13-40', timezone: 'UTC' },
        now,
      ),
    /échéance/,
  );
  assert.throws(
    () =>
      buildRetroplanningPreview(
        recipe,
        { date: '2026-10-01', time: '99:99', timezone: 'UTC' },
        now,
      ),
    /échéance/,
  );

  // An unknown IANA zone surfaces as an Intl range error, not a silent UTC
  // fallback.
  assert.throws(() =>
    buildRetroplanningPreview(
      recipe,
      { date: '2026-10-01', timezone: 'Not/AZone' },
      now,
    ),
  );
});

test('the shipped recipes are versioned and uniquely keyed', () => {
  const keys = RETROPLANNING_RECIPES.map((recipe) => recipe.key);

  assert.deepEqual([...keys].sort(), ['delivery', 'event']);
  assert.equal(new Set(keys).size, keys.length);

  for (const recipe of RETROPLANNING_RECIPES) {
    assert.equal(Number.isInteger(recipe.version) && recipe.version >= 1, true);
    assert.equal(findRetroplanningRecipe(recipe.key), recipe);
  }

  assert.equal(findRetroplanningRecipe('missing-recipe'), undefined);
});
