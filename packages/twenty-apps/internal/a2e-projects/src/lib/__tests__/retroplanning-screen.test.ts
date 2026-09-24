import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildRetroplanningPreview,
  findRetroplanningRecipe,
  reconcileRetroplanningDraft,
  type RetroplanningChangeSet,
  type RetroplanningRecipe,
} from '../retroplanning.ts';
import {
  buildDefaultRetroplanningDeadlineDate,
  buildRetroplanningInputKey,
  buildRetroplanningPreviewRows,
  collectRetroplanningAssigneeRoles,
  formatRetroplanningDay,
  getRetroplanningRoleLabel,
  isValidRetroplanningTimezone,
  summarizeRetroplanningChangeSet,
} from '../retroplanning-screen.ts';

const now = new Date('2026-09-01T00:00:00.000Z');
const delivery = findRetroplanningRecipe('delivery') as RetroplanningRecipe;
const event = findRetroplanningRecipe('event') as RetroplanningRecipe;

const emptyChangeSet = (): RetroplanningChangeSet => ({
  create: [],
  update: [],
  remove: [],
  protected: [],
  requiresDestructiveConfirmation: false,
});

test('rows read as a countdown and name dependencies by title', () => {
  const preview = buildRetroplanningPreview(
    delivery,
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    now,
  );
  const changeSet = reconcileRetroplanningDraft(delivery, preview.tasks, [], {
    mode: 'APPEND',
    confirmedDestructiveChange: false,
  });
  const rows = buildRetroplanningPreviewRows(preview, changeSet);

  assert.deepEqual(
    rows.map((row) => row.key),
    ['scope', 'brief', 'build-api', 'build-ui', 'build', 'review', 'release'],
  );
  assert.ok(
    rows.every(
      (row, index) =>
        index === 0 ||
        new Date(row.startAt).getTime() >=
          new Date((rows[index - 1] as (typeof rows)[number]).startAt).getTime(),
    ),
  );

  const release = rows.find((row) => row.key === 'release');

  assert.equal(release?.dueAt, '2026-10-01T16:00:00.000Z');
  assert.deepEqual(release?.dependsOnTitles, ['Recette interne']);
  assert.equal(release?.assigneeRole, 'lead');
  assert.ok(rows.every((row) => row.action === 'CREATE'));
});

test('subtasks are indented under their parent', () => {
  const preview = buildRetroplanningPreview(
    delivery,
    { date: '2026-10-01', timezone: 'Europe/Paris' },
    now,
  );
  const rows = buildRetroplanningPreviewRows(preview, emptyChangeSet());
  const depthByKey = Object.fromEntries(rows.map((row) => [row.key, row.depth]));

  assert.equal(depthByKey['build'], 0);
  assert.equal(depthByKey['build-api'], 1);
  assert.equal(depthByKey['build-ui'], 1);
  assert.equal(depthByKey['release'], 0);
});

test('each row says what confirming would do to it', () => {
  const preview = buildRetroplanningPreview(
    delivery,
    { date: '2026-10-08', timezone: 'Europe/Paris' },
    now,
  );
  const changeSet: RetroplanningChangeSet = {
    ...emptyChangeSet(),
    create: preview.tasks.filter((task) => task.key === 'brief'),
    update: [{ id: 't-release', key: 'release', provenance: 'p', dueAt: 'x' }],
    protected: [
      { id: 't-review', key: 'review', reason: 'MANUALLY_EDITED' },
      { id: 't-scope', key: 'scope', reason: 'COMPLETED' },
    ],
  };
  const actionByKey = Object.fromEntries(
    buildRetroplanningPreviewRows(preview, changeSet).map((row) => [
      row.key,
      row.action,
    ]),
  );

  assert.equal(actionByKey['brief'], 'CREATE');
  assert.equal(actionByKey['release'], 'UPDATE');
  assert.equal(actionByKey['review'], 'PROTECTED_MANUAL');
  assert.equal(actionByKey['scope'], 'PROTECTED_COMPLETED');
  assert.equal(actionByKey['build'], 'UNCHANGED');
});

test('warnings are attached to the rows they concern', () => {
  const preview = buildRetroplanningPreview(
    event,
    { date: '2026-09-05', timezone: 'Europe/Paris' },
    now,
  );
  const rows = buildRetroplanningPreviewRows(preview, emptyChangeSet());
  const venue = rows.find((row) => row.key === 'venue');
  const briefing = rows.find((row) => row.key === 'briefing');

  assert.deepEqual(venue?.warningCodes, ['PAST_DATE']);
  assert.deepEqual(briefing?.warningCodes, []);

  const speakers = rows.find((row) => row.key === 'speakers');

  // `invites` and `speakers` share the communication role on overlapping days
  // only if the schedule makes them overlap; the codes are de-duplicated.
  assert.ok(
    (speakers?.warningCodes ?? []).every(
      (code, index, codes) => codes.indexOf(code) === index,
    ),
  );
});

test('the summary counts the removals a REPLACE preview withholds', () => {
  const changeSet: RetroplanningChangeSet = {
    ...emptyChangeSet(),
    requiresDestructiveConfirmation: true,
  };

  assert.deepEqual(summarizeRetroplanningChangeSet(changeSet, 2), {
    create: 0,
    update: 0,
    protected: 0,
    remove: 2,
  });
  assert.equal(
    summarizeRetroplanningChangeSet({ ...changeSet, remove: ['a'] }, 0).remove,
    1,
  );
});

test('assignee roles follow first use and get readable labels', () => {
  assert.deepEqual(collectRetroplanningAssigneeRoles(delivery), [
    'lead',
    'team',
    'quality',
  ]);
  assert.deepEqual(collectRetroplanningAssigneeRoles(event), [
    'logistics',
    'communication',
    'team',
    'lead',
  ]);
  assert.equal(getRetroplanningRoleLabel('quality'), 'Qualité');
  assert.equal(getRetroplanningRoleLabel('custom-role'), 'custom-role');
});

test('the input key changes with any previewed input, not with role order', () => {
  const base = {
    projectId: 'project-1',
    recipeKey: 'delivery',
    deadline: { date: '2026-10-01', time: '18:00', timezone: 'Europe/Paris' },
    mode: 'APPEND' as const,
    assigneeRoles: { lead: 'member-a', team: 'member-b' },
  };
  const key = buildRetroplanningInputKey(base);

  assert.equal(
    buildRetroplanningInputKey({
      ...base,
      assigneeRoles: { team: 'member-b', lead: 'member-a', quality: '' },
    }),
    key,
  );
  assert.notEqual(
    buildRetroplanningInputKey({
      ...base,
      deadline: { ...base.deadline, time: '09:00' },
    }),
    key,
  );
  assert.notEqual(buildRetroplanningInputKey({ ...base, mode: 'REPLACE' }), key);
  assert.notEqual(
    buildRetroplanningInputKey({
      ...base,
      assigneeRoles: { lead: 'member-c', team: 'member-b' },
    }),
    key,
  );
});

test('time zones are validated against the IANA database', () => {
  assert.equal(isValidRetroplanningTimezone('Europe/Paris'), true);
  assert.equal(isValidRetroplanningTimezone('America/New_York'), true);
  assert.equal(isValidRetroplanningTimezone('Mars/Olympus'), false);
  assert.equal(isValidRetroplanningTimezone('  '), false);
});

test('the default deadline counts calendar days in the chosen zone', () => {
  const lateEvening = new Date('2026-09-01T23:30:00.000Z');

  assert.equal(
    buildDefaultRetroplanningDeadlineDate(lateEvening, 'UTC', 30),
    '2026-10-01',
  );
  // Already 2 September in Paris at 23:30 UTC.
  assert.equal(
    buildDefaultRetroplanningDeadlineDate(lateEvening, 'Europe/Paris', 30),
    '2026-10-02',
  );
  assert.equal(
    buildDefaultRetroplanningDeadlineDate(now, 'UTC', 0),
    '2026-09-01',
  );
});

test('days are formatted in the plan zone, not the viewer zone', () => {
  // 23:30 UTC on 30 Sept is 1 Oct in Paris.
  const label = formatRetroplanningDay(
    '2026-09-30T23:30:00.000Z',
    'Europe/Paris',
    'en-US',
  );

  assert.match(label, /Oct 1/);
});
