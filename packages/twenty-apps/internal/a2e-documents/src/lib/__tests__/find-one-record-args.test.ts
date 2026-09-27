import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildFindOneByIdArgs } from '../find-one-record-args.ts';

const SRC_DIR = join(import.meta.dirname, '..', '..');

// Every place that builds Core API reads at runtime: sandboxed front
// components and logic-function handlers share the same generated client.
const CORE_CLIENT_SOURCE_DIRS = [
  { dir: join(SRC_DIR, 'front-components'), suffix: '.tsx' },
  { dir: join(SRC_DIR, 'logic-functions', 'handlers'), suffix: '.ts' },
];

// A root read keyed by `id` — `client.query({ document: { __args: { id } } })`.
// Mutations (`client.mutation({ deleteDocument: { __args: { id } } })`)
// legitimately take `id` and are not matched.
const ROOT_QUERY_KEYED_BY_ID = /client\.query\(\{\s*\w+:\s*\{\s*__args:\s*\{\s*id\s*:/;

test('findOne args use the required filter argument, never a bare id', () => {
  assert.deepEqual(buildFindOneByIdArgs('document-1'), {
    filter: { id: { eq: 'document-1' } },
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

test('the guard pattern catches a bare-id read and spares mutations', () => {
  assert.equal(
    ROOT_QUERY_KEYED_BY_ID.test(
      'client.query({\n      document: {\n        __args: { id: documentId },',
    ),
    true,
  );
  assert.equal(
    ROOT_QUERY_KEYED_BY_ID.test(
      'client.mutation({\n        deleteDocument: {\n        __args: { id: documentNode.id },',
    ),
    false,
  );
});
