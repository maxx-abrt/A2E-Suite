import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  findMissingStarterFiches,
  findMissingStarterSheets,
  isStarterSheetSystemKey,
  STARTER_BOOK_SHEETS,
  STARTER_FICHES,
  starterFichePayloads,
  starterFicheTemplatesAreKnown,
  STARTER_SHEET_SYSTEM_KEYS,
} from '../starter-books.ts';

test('a fresh workspace is missing every starter sheet', () => {
  assert.deepEqual(
    findMissingStarterSheets([]).map((sheet) => sheet.systemKey),
    STARTER_SHEET_SYSTEM_KEYS,
  );
});

test('a fully seeded workspace is missing no starter sheet', () => {
  const existing = STARTER_BOOK_SHEETS.map((sheet) => sheet.systemKey);

  assert.deepEqual(findMissingStarterSheets(existing), []);
});

test('null or undefined keys never shadow a starter sheet', () => {
  const partial = [null, undefined, STARTER_SHEET_SYSTEM_KEYS[0]];

  const missing = findMissingStarterSheets(partial);

  assert.equal(missing.length, STARTER_BOOK_SHEETS.length - 1);
  assert.equal(
    missing.some((sheet) => sheet.systemKey === STARTER_SHEET_SYSTEM_KEYS[0]),
    false,
  );
});

test('starter sheet keys stay distinct from the ledger system key', () => {
  const keys = new Set(STARTER_SHEET_SYSTEM_KEYS);

  assert.equal(keys.size, STARTER_SHEET_SYSTEM_KEYS.length);
  assert.equal(keys.has('bilan.default.ledger'), false);
});

test('every starter sheet carries typed columns', () => {
  for (const sheet of STARTER_BOOK_SHEETS) {
    assert.ok(sheet.columns.length > 0, sheet.systemKey);

    for (const ledgerColumn of sheet.columns) {
      assert.equal(ledgerColumn.isManaged, false, sheet.systemKey);
      assert.ok(ledgerColumn.width > 0, ledgerColumn.id);
    }
  }
});

test('fiche delta is keyed on title AND templateKey together', () => {
  assert.deepEqual(findMissingStarterFiches([]), STARTER_FICHES);

  const sameTitleDifferentTemplate = findMissingStarterFiches(
    STARTER_FICHES.map((starter) => ({
      title: starter.title,
      templateKey: 'BLANK',
    })),
  );

  assert.equal(sameTitleDifferentTemplate.length, STARTER_FICHES.length);

  const seeded = findMissingStarterFiches(
    STARTER_FICHES.map((starter) => ({
      title: starter.title,
      templateKey: starter.templateKey,
    })),
  );

  assert.deepEqual(seeded, []);
});

test('starter fiche payloads match the editor templates', () => {
  assert.equal(starterFicheTemplatesAreKnown(), true);

  const payloads = starterFichePayloads();

  assert.equal(payloads.length, STARTER_FICHES.length);

  for (const payload of payloads) {
    assert.ok(Object.keys(payload.data).length > 0, payload.templateKey);
    assert.match(payload.fiscalYear, /^\d{4}$/);
  }
});

test('only starter keys answer the starter-sheet predicate', () => {
  assert.equal(isStarterSheetSystemKey('bilan.starter.dons'), true);
  assert.equal(isStarterSheetSystemKey('bilan.default.ledger'), false);
  assert.equal(isStarterSheetSystemKey('user.made.this'), false);
});
