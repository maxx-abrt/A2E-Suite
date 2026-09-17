import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runInstallStep } from '../install-steps.ts';

test('an OK step carries its result', async () => {
  const outcome = await runInstallStep('categories', async () => 7);

  assert.deepEqual(outcome, {
    step: 'categories',
    status: 'OK',
    result: 7,
  });
});

test('a failed step records the step name and error, without throwing', async () => {
  const failures: string[] = [];

  const outcome = await runInstallStep(
    'orgProfile',
    async () => {
      throw new Error('CoreApiClient was not generated');
    },
    (failed) => failures.push(failed.step),
  );

  assert.equal(outcome.status, 'FAILED');
  assert.equal(outcome.error, 'Error: CoreApiClient was not generated');
  assert.equal(outcome.result, undefined);
  assert.deepEqual(failures, ['orgProfile']);
});

test('a failed step never blocks the next one', async () => {
  const executed: string[] = [];

  await runInstallStep('first', async () => {
    executed.push('first');
    throw new Error('boom');
  });
  await runInstallStep('second', async () => {
    executed.push('second');
    return true;
  });

  assert.deepEqual(executed, ['first', 'second']);
});

test('non-Error throws are stringified, not lost', async () => {
  const outcome = await runInstallStep('ledger', async () => {
    throw 'raw string failure';
  });

  assert.equal(outcome.status, 'FAILED');
  assert.equal(outcome.error, 'raw string failure');
});
