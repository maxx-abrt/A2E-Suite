import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readCounterState } from '../numbering.ts';

test('a well-formed counter passes through unchanged', () => {
  assert.deepEqual(
    readCounterState(
      { invoiceNumberPrefix: 'FA-{{YYYY}}-', invoiceNextNumber: 7 },
      'invoiceNumberPrefix',
      'invoiceNextNumber',
    ),
    { prefix: 'FA-{{YYYY}}-', next: 7 },
  );
});

test('a missing or malformed counter falls back to the first number', () => {
  assert.deepEqual(
    readCounterState({}, 'invoiceNumberPrefix', 'invoiceNextNumber'),
    { prefix: undefined, next: 1 },
  );
  assert.deepEqual(
    readCounterState(
      { invoiceNextNumber: null },
      'invoiceNumberPrefix',
      'invoiceNextNumber',
    ),
    { prefix: undefined, next: 1 },
  );
  assert.deepEqual(
    readCounterState(
      { invoiceNextNumber: 0 },
      'invoiceNumberPrefix',
      'invoiceNextNumber',
    ),
    { prefix: undefined, next: 1 },
  );
  assert.deepEqual(
    readCounterState(
      { invoiceNextNumber: 2.5 },
      'invoiceNumberPrefix',
      'invoiceNextNumber',
    ),
    { prefix: undefined, next: 1 },
  );
});

test('an empty prefix normalizes to undefined so the caller applies the default', () => {
  assert.deepEqual(
    readCounterState(
      { invoiceNumberPrefix: '', invoiceNextNumber: 4 },
      'invoiceNumberPrefix',
      'invoiceNextNumber',
    ),
    { prefix: undefined, next: 4 },
  );
});
