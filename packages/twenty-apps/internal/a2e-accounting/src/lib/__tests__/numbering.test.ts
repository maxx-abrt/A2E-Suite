import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDocumentNumber,
  findSequenceGaps,
  nextSequenceFrom,
  parseSequenceNumber,
} from '../numbering.ts';

const january = new Date('2026-01-15T10:00:00.000Z');

test('the template resolves year and month placeholders', () => {
  assert.equal(
    buildDocumentNumber({ prefix: 'FA-{{YYYY}}-', next: 7 }, january),
    'FA-2026-0007',
  );
  assert.equal(
    buildDocumentNumber({ prefix: 'DEV{{YY}}{{MM}}', next: 3 }, january),
    'DEV26010003',
  );
});

test('padding is configurable and never truncates a long sequence', () => {
  assert.equal(
    buildDocumentNumber({ prefix: 'FA-', next: 12_345, padding: 3 }, january),
    'FA-12345',
  );
});

test('parsing is the exact inverse of building', () => {
  const number = buildDocumentNumber(
    { prefix: 'FA-{{YYYY}}-', next: 42 },
    january,
  );

  assert.equal(parseSequenceNumber(number), 42);
});

test('a number without trailing digits parses to undefined', () => {
  assert.equal(parseSequenceNumber('ACOMPTE'), undefined);
});

test('gaps in a sequence are surfaced, not renumbered', () => {
  assert.deepEqual(
    findSequenceGaps(['FA-2026-0001', 'FA-2026-0002', 'FA-2026-0005']),
    [3, 4],
  );
  assert.deepEqual(findSequenceGaps(['FA-2026-0001', 'FA-2026-0002']), []);
  assert.deepEqual(findSequenceGaps([]), []);
});

test('the next sequence continues the highest existing number', () => {
  assert.equal(nextSequenceFrom(['FA-2026-0001', 'FA-2026-0009']), 10);
  assert.equal(nextSequenceFrom([]), 1);
});
