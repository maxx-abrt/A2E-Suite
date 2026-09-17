import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  computeTaskHumanId,
  hasTaskHumanId,
  readTaskCounter,
  readTaskProjectId,
} from '../task-human-id.ts';

test('the human id is the project key joined to the sequence', () => {
  assert.equal(computeTaskHumanId('PRJ', 1), 'PRJ-1');
  assert.equal(computeTaskHumanId('LIV', 42), 'LIV-42');
});

test('only a non-empty string counts as an already-numbered task', () => {
  assert.equal(hasTaskHumanId({ id: 't1', humanId: 'PRJ-1' }), true);
  assert.equal(hasTaskHumanId({ id: 't1', humanId: '' }), false);
  assert.equal(hasTaskHumanId({ id: 't1', humanId: null }), false);
  assert.equal(hasTaskHumanId({ id: 't1' }), false);
});

test('a task without a joined project exposes no project id', () => {
  assert.equal(readTaskProjectId({ id: 't1', project: { id: 'p1' } }), 'p1');
  assert.equal(readTaskProjectId({ id: 't1', project: null }), undefined);
  assert.equal(readTaskProjectId({ id: 't1' }), undefined);
  assert.equal(readTaskProjectId({ id: 't1', project: { id: '' } }), undefined);
});

test('the counter normalizes missing and malformed values to "no task yet"', () => {
  assert.equal(readTaskCounter({ taskCounter: 7 }), 7);
  assert.equal(readTaskCounter({ taskCounter: 0 }), 0);
  assert.equal(readTaskCounter({ taskCounter: null }), 0);
  assert.equal(readTaskCounter({}), 0);
  // A string or fractional value must not leak into the human id.
  assert.equal(readTaskCounter({ taskCounter: '5' as never }), 0);
  assert.equal(readTaskCounter({ taskCounter: 1.5 }), 0);
  assert.equal(readTaskCounter({ taskCounter: -3 }), 0);
});
