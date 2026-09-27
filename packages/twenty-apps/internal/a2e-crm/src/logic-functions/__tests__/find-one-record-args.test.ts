import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildFindOneByIdArgs } from '../handlers/crm-tool-support.ts';

const HANDLERS_DIR = join(import.meta.dirname, '..', 'handlers');

// A root read keyed by `id` — `client.query({ person: { __args: { id } } })`.
const ROOT_QUERY_KEYED_BY_ID = /client\.query\(\{\s*\w+:\s*\{\s*__args:\s*\{\s*id\s*:/;

test('findOne args use the required filter argument, never a bare id', () => {
  assert.deepEqual(buildFindOneByIdArgs('person-1'), {
    filter: { id: { eq: 'person-1' } },
  });
});

test('no CRM tool handler sends a root Core query keyed by a bare id', () => {
  const offenders = readdirSync(HANDLERS_DIR)
    .filter((fileName) => fileName.endsWith('.ts'))
    .filter((fileName) =>
      ROOT_QUERY_KEYED_BY_ID.test(
        readFileSync(join(HANDLERS_DIR, fileName), 'utf8'),
      ),
    );

  assert.deepEqual(offenders, []);
});
