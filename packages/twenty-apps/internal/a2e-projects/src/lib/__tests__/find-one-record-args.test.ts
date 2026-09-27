import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildFindOneByIdArgs } from '../find-one-record-args.ts';

const SRC_DIR = join(import.meta.dirname, '..', '..');

// Every place that builds Core API reads at runtime: sandboxed front
// components and logic-function handlers share the same generated client.
const CORE_CLIENT_SOURCE_DIRS = [
  { dir: join(SRC_DIR, 'front-components'), suffix: '.front-component.tsx' },
  { dir: join(SRC_DIR, 'logic-functions', 'handlers'), suffix: '.ts' },
];

// A root read keyed by `id` — `client.query({ task: { __args: { id: … } } })`.
// Mutations (`client.mutation({ updateTask: { __args: { id, data } } })`)
// legitimately take `id` and are not matched.
const ROOT_QUERY_KEYED_BY_ID = /client\.query\(\{\s*\w+:\s*\{\s*__args:\s*\{\s*id\s*:/;

test('findOne args use the required filter argument, never a bare id', () => {
  assert.deepEqual(buildFindOneByIdArgs('project-1'), {
    filter: { id: { eq: 'project-1' } },
  });
  assert.equal(
    Object.prototype.hasOwnProperty.call(buildFindOneByIdArgs('x'), 'id'),
    false,
  );
});

test('no front component or handler sends a root Core query keyed by a bare id', () => {
  const offenders = CORE_CLIENT_SOURCE_DIRS.flatMap(({ dir, suffix }) =>
    readdirSync(dir)
      .filter((fileName) => fileName.endsWith(suffix))
      .filter((fileName) =>
        ROOT_QUERY_KEYED_BY_ID.test(readFileSync(join(dir, fileName), 'utf8')),
      ),
  );

  assert.deepEqual(offenders, []);
});

test('the guard pattern catches the P4.2c shape and spares mutations', () => {
  assert.equal(
    ROOT_QUERY_KEYED_BY_ID.test(
      'client.query({\n    project: {\n      __args: { id: scopeProjectId },',
    ),
    true,
  );
  assert.equal(
    ROOT_QUERY_KEYED_BY_ID.test(
      'client.mutation({\n  updateTask: {\n    __args: { id: taskId, data },',
    ),
    false,
  );
  assert.equal(
    ROOT_QUERY_KEYED_BY_ID.test(
      'client.query({\n  task: {\n    __args: buildFindOneByIdArgs(taskId),',
    ),
    false,
  );
});
