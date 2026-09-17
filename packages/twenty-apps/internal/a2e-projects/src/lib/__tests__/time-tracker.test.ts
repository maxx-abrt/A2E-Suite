import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildProjectTimeRollup,
  buildTimeRollupByProject,
  computeElapsedMinutes,
  formatDuration,
  isTimerRunningForTask,
  parseTimer,
  readTimeEntryProjectId,
  readTimeEntryTaskId,
  serializeTimer,
  startTimer,
  stopTimer,
  sumTimeEntryMinutes,
  type TimeEntryRecord,
  type TimeTrackerTimer,
} from '../time-tracker.ts';

const at = (iso: string): Date => new Date(iso);

test('a timer starts with the normalized task, project and instant', () => {
  const timer = startTimer({
    taskId: 't1',
    projectId: 'p1',
    now: at('2026-09-17T10:00:00.000Z'),
  });

  assert.deepEqual(timer, {
    taskId: 't1',
    projectId: 'p1',
    startedAt: '2026-09-17T10:00:00.000Z',
  });
});

test('a timer refuses to start without a task and normalizes an empty project', () => {
  assert.throws(() =>
    startTimer({ taskId: '', now: at('2026-09-17T10:00:00.000Z') }),
  );
  assert.throws(() =>
    startTimer({ taskId: '   '.trim(), now: at('2026-09-17T10:00:00.000Z') }),
  );

  const timer = startTimer({
    taskId: 't1',
    projectId: '',
    now: at('2026-09-17T10:00:00.000Z'),
  });

  assert.equal(timer.projectId, null);
});

test('elapsed minutes floor the whole minutes and never go negative', () => {
  assert.equal(
    computeElapsedMinutes(
      '2026-09-17T10:00:00.000Z',
      at('2026-09-17T10:01:59.000Z'),
    ),
    1,
  );
  assert.equal(
    computeElapsedMinutes(
      '2026-09-17T10:00:00.000Z',
      at('2026-09-17T11:30:00.000Z'),
    ),
    90,
  );
  assert.equal(
    computeElapsedMinutes(
      '2026-09-17T10:00:00.000Z',
      at('2026-09-17T09:59:00.000Z'),
    ),
    0,
  );
  assert.equal(
    computeElapsedMinutes('not-a-date', at('2026-09-17T10:00:00.000Z')),
    0,
  );
  assert.equal(computeElapsedMinutes(null, at('2026-09-17T10:00:00.000Z')), 0);
});

test('stopping a timer builds one time-entry payload', () => {
  const timer: TimeTrackerTimer = {
    taskId: 't1',
    projectId: 'p1',
    startedAt: '2026-09-17T10:00:00.000Z',
  };
  const payload = stopTimer({ timer, now: at('2026-09-17T10:45:30.000Z') });

  assert.deepEqual(payload, {
    label: '45 min',
    minutes: 45,
    spentAt: '2026-09-17T10:45:30.000Z',
    taskId: 't1',
    projectId: 'p1',
  });
});

test('a sub-minute stop still logs the minimum, and an invalid start logs it too', () => {
  const short = stopTimer({
    timer: {
      taskId: 't1',
      projectId: null,
      startedAt: '2026-09-17T10:00:30.000Z',
    },
    now: at('2026-09-17T10:00:45.000Z'),
  });

  assert.equal(short.minutes, 1);
  assert.equal(short.label, '1 min');

  const corrupt = stopTimer({
    timer: { taskId: 't1', projectId: null, startedAt: 'broken' },
    now: at('2026-09-17T10:00:00.000Z'),
  });

  assert.equal(corrupt.minutes, 1);
});

test('the minimum floor is overridable', () => {
  const payload = stopTimer({
    timer: {
      taskId: 't1',
      projectId: null,
      startedAt: '2026-09-17T10:00:30.000Z',
    },
    now: at('2026-09-17T10:00:45.000Z'),
    minimumMinutes: 0,
  });

  assert.equal(payload.minutes, 0);
});

test('a timer is running only for its own task', () => {
  const timer: TimeTrackerTimer = {
    taskId: 't1',
    projectId: null,
    startedAt: '2026-09-17T10:00:00.000Z',
  };

  assert.equal(isTimerRunningForTask(timer, 't1'), true);
  assert.equal(isTimerRunningForTask(timer, 't2'), false);
  assert.equal(isTimerRunningForTask(timer, null), false);
  assert.equal(isTimerRunningForTask(null, 't1'), false);
});

test('a serialized timer round-trips and malformed input reads as no timer', () => {
  const timer: TimeTrackerTimer = {
    taskId: 't1',
    projectId: 'p1',
    startedAt: '2026-09-17T10:00:00.000Z',
  };

  assert.deepEqual(parseTimer(serializeTimer(timer)), timer);
  assert.equal(parseTimer(null), null);
  assert.equal(parseTimer(''), null);
  assert.equal(parseTimer('{not json'), null);
  assert.equal(parseTimer('{"taskId":"t1"}'), null);
  assert.equal(parseTimer('{"startedAt":"2026-09-17T10:00:00.000Z"}'), null);

  const withoutProject = parseTimer(
    '{"taskId":"t1","startedAt":"2026-09-17T10:00:00.000Z"}',
  );

  assert.deepEqual(withoutProject, {
    taskId: 't1',
    projectId: null,
    startedAt: '2026-09-17T10:00:00.000Z',
  });
});

test('the task and project ids are read from the relation or the foreign key', () => {
  assert.equal(readTimeEntryTaskId({ task: { id: 't1' } }), 't1');
  assert.equal(readTimeEntryTaskId({ taskId: 't2' }), 't2');
  assert.equal(readTimeEntryTaskId({ taskId: '' }), null);
  assert.equal(readTimeEntryTaskId(null), null);
  assert.equal(readTimeEntryProjectId({ project: { id: 'p1' } }), 'p1');
  assert.equal(readTimeEntryProjectId({ projectId: 'p2' }), 'p2');
  assert.equal(readTimeEntryProjectId({ projectId: '' }), null);
  assert.equal(readTimeEntryProjectId(undefined), null);
});

test('durations format as minutes then hours and minutes', () => {
  assert.equal(formatDuration(0), '0 min');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(60), '1 h 00');
  assert.equal(formatDuration(90), '1 h 30');
  assert.equal(formatDuration(125), '2 h 05');
  assert.equal(formatDuration(-10), '0 min');
  assert.equal(formatDuration(Number.NaN), '0 min');
});

test('the minute sum ignores missing, negative and non-numeric entries', () => {
  const entries: TimeEntryRecord[] = [
    { id: 'e1', minutes: 30 },
    { id: 'e2', minutes: 15.9 },
    { id: 'e3', minutes: null },
    { id: 'e4' },
    { id: 'e5', minutes: -5 },
    { id: 'e6', minutes: Number.NaN },
  ];

  assert.equal(sumTimeEntryMinutes(entries), 45);
  assert.equal(sumTimeEntryMinutes([]), 0);
});

test('the project rollup groups by task, biggest first, with a no-task bucket', () => {
  const entries: TimeEntryRecord[] = [
    { id: 'e1', minutes: 30, task: { id: 't1', title: 'A' } },
    { id: 'e2', minutes: 60, task: { id: 't2', title: 'B' } },
    { id: 'e3', minutes: 15, task: { id: 't1', title: 'A' } },
    { id: 'e4', minutes: 5, project: { id: 'p1' } },
  ];
  const rollup = buildProjectTimeRollup(entries);

  assert.equal(rollup.totalMinutes, 110);
  assert.deepEqual(rollup.rows, [
    { taskId: 't2', taskTitle: 'B', totalMinutes: 60, entryCount: 1 },
    { taskId: 't1', taskTitle: 'A', totalMinutes: 45, entryCount: 2 },
    {
      taskId: 'sans-tache',
      taskTitle: 'Sans tâche',
      totalMinutes: 5,
      entryCount: 1,
    },
  ]);
});

test('the project rollup falls back to the task id and keeps a stable order', () => {
  const entries: TimeEntryRecord[] = [
    { id: 'e1', minutes: 10, taskId: 't1' },
    { id: 'e2', minutes: 10, taskId: 't2' },
  ];
  const rollup = buildProjectTimeRollup(entries);

  assert.deepEqual(
    rollup.rows.map((row) => row.taskId),
    ['t1', 't2'],
  );
  assert.equal(rollup.rows[0].taskTitle, 't1');
});

test('the workspace rollup groups by project and detaches land in one bucket', () => {
  const entries: TimeEntryRecord[] = [
    { id: 'e1', minutes: 30, project: { id: 'p1' } },
    { id: 'e2', minutes: 60, projectId: 'p2' },
    { id: 'e3', minutes: 15, project: { id: 'p1' } },
    { id: 'e4', minutes: 5, task: { id: 't1', title: 'A' } },
  ];
  const rollup = buildTimeRollupByProject(entries);

  assert.equal(rollup.totalMinutes, 110);
  assert.deepEqual(rollup.rows, [
    { projectId: 'p2', totalMinutes: 60, entryCount: 1 },
    { projectId: 'p1', totalMinutes: 45, entryCount: 2 },
    { projectId: 'sans-projet', totalMinutes: 5, entryCount: 1 },
  ]);
});
