import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildTaskDependencyPayload,
  collectTaskDependencyCandidates,
  collectTaskDependencyIdMap,
  isTaskDependencyCycle,
  readTaskDependencyId,
} from '../task-dependencies.ts';

test('the dependency id is read from the relation or the join column', () => {
  assert.equal(readTaskDependencyId({ blockedBy: { id: 't1' } }), 't1');
  assert.equal(readTaskDependencyId({ blockedById: 't2' }), 't2');
  assert.equal(
    readTaskDependencyId({ blockedBy: null, blockedById: null }),
    null,
  );
  assert.equal(readTaskDependencyId({ blockedById: '' }), null);
  assert.equal(readTaskDependencyId(null), null);
  assert.equal(readTaskDependencyId(undefined), null);
});

// The reference chain (x → y means x.blockedBy = y): a → b → c → d.
const chainMap = collectTaskDependencyIdMap([
  { id: 'a', blockedById: 'b' },
  { id: 'b', blockedById: 'c' },
  { id: 'c', blockedById: 'd' },
  { id: 'd' },
]);

test('a valid chain re-applied is never a cycle', () => {
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'a',
      candidateDependencyId: 'b',
      dependencyIdByTaskId: chainMap,
    }),
    false,
  );
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'b',
      candidateDependencyId: 'c',
      dependencyIdByTaskId: chainMap,
    }),
    false,
  );
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'c',
      candidateDependencyId: 'd',
      dependencyIdByTaskId: chainMap,
    }),
    false,
  );
});

test('a task cannot be blocked by itself', () => {
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'a',
      candidateDependencyId: 'a',
      dependencyIdByTaskId: chainMap,
    }),
    true,
  );
});

test('a two-node cycle is refused', () => {
  // A is already blocked by B; making B blocked by A closes B→A→B.
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'b',
      candidateDependencyId: 'a',
      dependencyIdByTaskId: chainMap,
    }),
    true,
  );
});

test('a deep cycle is refused across the whole chain', () => {
  // Making D blocked by A closes the loop A→B→C→D→A.
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'd',
      candidateDependencyId: 'a',
      dependencyIdByTaskId: chainMap,
    }),
    true,
  );

  // The opposite direction is a legal extension: A blocked by D walks
  // D → null and never reaches A.
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'a',
      candidateDependencyId: 'd',
      dependencyIdByTaskId: chainMap,
    }),
    false,
  );
});

test('no dependency and an unknown dependency are never a cycle', () => {
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'a',
      candidateDependencyId: null,
      dependencyIdByTaskId: chainMap,
    }),
    false,
  );
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'a',
      candidateDependencyId: '',
      dependencyIdByTaskId: chainMap,
    }),
    false,
  );
  assert.equal(
    isTaskDependencyCycle({
      taskId: 'a',
      candidateDependencyId: 'missing',
      dependencyIdByTaskId: chainMap,
    }),
    false,
  );
});

test('an already-looping dependency chain is detected from outside it', () => {
  const loopingMap = collectTaskDependencyIdMap([
    { id: 'x', blockedById: 'y' },
    { id: 'y', blockedById: 'x' },
  ]);

  assert.equal(
    isTaskDependencyCycle({
      taskId: 'task',
      candidateDependencyId: 'x',
      dependencyIdByTaskId: loopingMap,
    }),
    true,
  );
});

test('the payload builder refuses a cyclic dependency and clears it with null', () => {
  assert.deepEqual(
    buildTaskDependencyPayload({
      taskId: 'a',
      candidateDependencyId: 'd',
      dependencyIdByTaskId: chainMap,
    }),
    { blockedById: 'd' },
  );
  assert.deepEqual(
    buildTaskDependencyPayload({
      taskId: 'a',
      candidateDependencyId: null,
      dependencyIdByTaskId: chainMap,
    }),
    { blockedById: null },
  );
  assert.throws(() =>
    buildTaskDependencyPayload({
      taskId: 'a',
      candidateDependencyId: 'a',
      dependencyIdByTaskId: chainMap,
    }),
  );
  assert.throws(() =>
    buildTaskDependencyPayload({
      taskId: 'd',
      candidateDependencyId: 'a',
      dependencyIdByTaskId: chainMap,
    }),
  );
});

test('the picker drops the task and its dependents, keeps legal blockers', () => {
  // `dependent` is blocked by `a`, so it can never become `a`'s blocker; the
  // upstream chain (b, c, d) and an unrelated task stay selectable.
  const pickerMap = collectTaskDependencyIdMap([
    { id: 'a', blockedById: 'b' },
    { id: 'b', blockedById: 'c' },
    { id: 'c', blockedById: 'd' },
    { id: 'd' },
    { id: 'dependent', blockedById: 'a' },
    { id: 'free' },
  ]);

  const candidateIds = collectTaskDependencyCandidates({
    taskId: 'a',
    tasks: [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
      { id: 'd' },
      { id: 'dependent' },
      { id: 'free' },
    ],
    dependencyIdByTaskId: pickerMap,
  }).map((task) => task.id);

  assert.deepEqual(candidateIds, ['b', 'c', 'd', 'free']);
});
