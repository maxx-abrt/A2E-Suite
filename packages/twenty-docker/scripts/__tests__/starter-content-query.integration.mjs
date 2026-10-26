import assert from 'node:assert/strict';
import { test } from 'node:test';

import pg from 'pg';

import { buildStarterContentQuery } from '../build-starter-content-query.mjs';

const connectionString = process.env.A2E_SMOKE_SQL_TEST_URL;
if (!connectionString)
  throw new Error(
    'Set A2E_SMOKE_SQL_TEST_URL to the disposable local test database',
  );
const database = new URL(connectionString);
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
  database.pathname !== '/test'
)
  throw new Error('The SQL regression requires the local test database');

test('counts native app tables and standard project tasks in PostgreSQL', async () => {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    // Session-local fixtures exercise PostgreSQL without changing workspace schemas.
    await client.query(`
      CREATE TEMP TABLE "_document" (kind text);
      CREATE TEMP TABLE "_project" (id integer);
      CREATE TEMP TABLE task ("projectId" integer);
      CREATE TEMP TABLE "_milestone" (id integer);
      CREATE TEMP TABLE "_chatChannel" (id integer);
      INSERT INTO "_document" VALUES ('DOCUMENT'), ('TEMPLATE'), ('TEMPLATE');
      INSERT INTO "_project" VALUES (1), (2);
      INSERT INTO task VALUES (NULL), (1), (2);
      INSERT INTO "_milestone" VALUES (1);
      INSERT INTO "_chatChannel" VALUES (1), (2);
      CREATE TEMP TABLE document (kind text);
      CREATE TEMP TABLE project (id integer);
      CREATE TEMP TABLE milestone (id integer);
      CREATE TEMP TABLE "chatChannel" (id integer);
      CREATE TEMP TABLE "_task" ("projectId" integer);
    `);
    const result = await client.query(buildStarterContentQuery('pg_temp'));
    assert.deepEqual(result.rows[0].json_build_object, {
      templates: 2,
      projects: 2,
      projectTasks: 2,
      milestones: 1,
      channels: 2,
    });
    await client.query('INSERT INTO "_document" VALUES (\'TEMPLATE\')');
    const updatedResult = await client.query(
      buildStarterContentQuery('pg_temp'),
    );
    assert.equal(updatedResult.rows[0].json_build_object.templates, 3);
    await client.query('DROP TABLE "_document"');
    await assert.rejects(client.query(buildStarterContentQuery('pg_temp')), {
      code: '42P01',
    });
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
