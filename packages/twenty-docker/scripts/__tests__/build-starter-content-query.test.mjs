import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildStarterContentQuery } from '../build-starter-content-query.mjs';

test('addresses application objects and standard tasks with their native table names', () => {
  const query = buildStarterContentQuery('workspace_smoke');
  for (const table of [
    '_document',
    '_project',
    'task',
    '_milestone',
    '_chatChannel',
  ])
    assert.ok(query.includes(`"workspace_smoke"."${table}"`));
  assert.ok(query.includes('"projectId" IS NOT NULL'));
  assert.ok(query.includes("kind = 'TEMPLATE'"));
  assert.ok(!query.includes('"_task"'));
});

test('refuses invalid schema identifiers before building SQL', () => {
  for (const schema of [
    undefined,
    '',
    'workspace_smoke"',
    'workspace_smoke; SELECT 1',
    'public.workspace',
  ])
    assert.throws(
      () => buildStarterContentQuery(schema),
      /valid schema identifier/,
    );
});
