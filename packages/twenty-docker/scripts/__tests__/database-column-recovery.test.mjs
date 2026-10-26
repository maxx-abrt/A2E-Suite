import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateRecoveryTarget } from '../../../twenty-server/scripts/recover-column-slots.mjs';

const SOURCE_URL =
  'postgres://operator:password@database:5432/bureau?sslmode=require';

test('preserves connection options while targeting a new database', () => {
  const result = validateRecoveryTarget(SOURCE_URL, 'bureau_recovered');
  assert.equal(result.sourceDatabase, 'bureau');
  assert.equal(new URL(result.targetUrl).pathname, '/bureau_recovered');
  assert.equal(
    new URL(result.targetUrl).searchParams.get('sslmode'),
    'require',
  );
  assert.equal(new URL(result.administrationUrl).pathname, '/postgres');
});

for (const target of [
  'bureau',
  'postgres',
  'template0',
  'template1',
  '',
  undefined,
  'a'.repeat(64),
  'target; DROP DATABASE bureau',
]) {
  test(`refuses an unsafe recovery target (${String(target)})`, () => {
    assert.throws(() => validateRecoveryTarget(SOURCE_URL, target));
  });
}

test('refuses non-PostgreSQL and maintenance source databases', () => {
  assert.throws(() =>
    validateRecoveryTarget('https://database/bureau', 'recovered'),
  );
  assert.throws(() =>
    validateRecoveryTarget('postgres://database/postgres', 'recovered'),
  );
});
