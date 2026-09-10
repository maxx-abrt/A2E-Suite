import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  budgetAlertMessage,
  computeBudgetProgress,
  isWithinWindow,
  resolveBudgetWindow,
} from '../budget.ts';
import { moneyFromAmount, toMicros } from '../money.ts';

const reference = new Date('2026-05-17T12:00:00.000Z');

test('monthly, quarterly and yearly windows bound the right period', () => {
  assert.deepEqual(resolveBudgetWindow('MONTHLY', reference), {
    startDate: '2026-05-01',
    endDate: '2026-05-31',
  });
  assert.deepEqual(resolveBudgetWindow('QUARTERLY', reference), {
    startDate: '2026-04-01',
    endDate: '2026-06-30',
  });
  assert.deepEqual(resolveBudgetWindow('YEARLY', reference), {
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });
});

test('a February window ends on the real last day', () => {
  assert.equal(
    resolveBudgetWindow('MONTHLY', new Date('2026-02-10T00:00:00Z')).endDate,
    '2026-02-28',
  );
  assert.equal(
    resolveBudgetWindow('MONTHLY', new Date('2028-02-10T00:00:00Z')).endDate,
    '2028-02-29',
  );
});

test('a custom window falls back to the civil year when unset', () => {
  assert.deepEqual(resolveBudgetWindow('CUSTOM', reference), {
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });
  assert.deepEqual(
    resolveBudgetWindow('CUSTOM', reference, {
      startDate: '2026-09-01',
      endDate: '2027-08-31',
    }),
    { startDate: '2026-09-01', endDate: '2027-08-31' },
  );
});

test('window membership includes both bounds', () => {
  const window = { startDate: '2026-05-01', endDate: '2026-05-31' };

  assert.equal(isWithinWindow(window, '2026-05-01T00:00:00Z'), true);
  assert.equal(isWithinWindow(window, '2026-05-31T23:00:00Z'), true);
  assert.equal(isWithinWindow(window, '2026-06-01T00:00:00Z'), false);
});

test('progress levels escalate at the threshold, at 100 % and beyond', () => {
  const budget = moneyFromAmount(1000);

  assert.equal(computeBudgetProgress(budget, toMicros(500)).level, 'OK');
  assert.equal(computeBudgetProgress(budget, toMicros(800)).level, 'WARNING');
  assert.equal(computeBudgetProgress(budget, toMicros(1000)).level, 'REACHED');
  assert.equal(computeBudgetProgress(budget, toMicros(1200)).level, 'EXCEEDED');
});

test('a custom threshold moves the warning', () => {
  const progress = computeBudgetProgress(
    moneyFromAmount(1000),
    toMicros(650),
    60,
  );

  assert.equal(progress.level, 'WARNING');
  assert.equal(progress.percent, 65);
});

test('a zero budget never divides by zero', () => {
  const progress = computeBudgetProgress(moneyFromAmount(0), toMicros(10));

  assert.equal(progress.percent, 0);
  assert.equal(progress.level, 'OK');
});

test('only a non-OK budget produces an alert message', () => {
  const budget = moneyFromAmount(1000);

  assert.equal(
    budgetAlertMessage('Communication', computeBudgetProgress(budget, toMicros(100))),
    undefined,
  );
  assert.match(
    budgetAlertMessage(
      'Communication',
      computeBudgetProgress(budget, toMicros(1200)),
    ) ?? '',
    /dépassé/,
  );
});
