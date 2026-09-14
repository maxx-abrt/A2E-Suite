import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fromMicros, roundHalfUp, toMicros } from '../money.ts';

// The single rounding discipline for money in Bilan: half away from zero.
// Every entry point (quick-entry front component, VAT, budgets) must go
// through it — raw Math.round is half toward +∞ and disagrees on -x.5.

test('rounding is half away from zero, symmetric on negatives', () => {
  assert.equal(roundHalfUp(2.5), 3);
  assert.equal(roundHalfUp(-2.5), -3);
  assert.equal(roundHalfUp(0.5), 1);
  assert.equal(roundHalfUp(-0.5), -1);
});

test('toMicros never loses a cent on typical decimal input', () => {
  assert.equal(toMicros(19.99), 19_990_000);
  assert.equal(toMicros(0.005), 5_000);
  assert.equal(toMicros(-0.005), -5_000);
  assert.equal(toMicros(fromMicros(1_234_567_890)), 1_234_567_890);
});
