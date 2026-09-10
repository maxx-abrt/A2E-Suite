import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildLedgerRow,
  buildLedgerSourceKey,
  isLedgerPeriodLocked,
  LEDGER_COLUMNS,
  LEDGER_SYSTEM_KEY,
  MANAGED_LEDGER_COLUMN_IDS,
  mergeLedgerCells,
  toCsv,
} from '../ledger.ts';

const input = {
  sourceKind: 'FINANCE_ENTRY' as const,
  sourceId: 'entry-1',
  entryDate: '2026-03-04T09:00:00.000Z',
  entryType: 'EXPENSE' as const,
  label: 'Assurance RC',
  amountMicros: 240_000_000,
  currencyCode: 'EUR',
  categoryLabel: 'Assurances',
  paymentMethodLabel: 'Prélèvement',
  reference: 'EXP-000012',
  proofLabels: ['contrat.pdf', 'echeancier.pdf'],
};

test('the source key is stable and unique per source record', () => {
  assert.equal(
    buildLedgerSourceKey('FINANCE_ENTRY', 'entry-1'),
    'FINANCE_ENTRY:entry-1',
  );
  assert.notEqual(
    buildLedgerSourceKey('INVOICE', 'entry-1'),
    buildLedgerSourceKey('FINANCE_ENTRY', 'entry-1'),
  );
});

test('the same source always builds the identical row: replay is idempotent', () => {
  assert.deepEqual(buildLedgerRow(input), buildLedgerRow(input));
  assert.equal(buildLedgerRow(input).sourceKey, 'FINANCE_ENTRY:entry-1');
});

test('a row carries the French type label and an ISO day', () => {
  const row = buildLedgerRow(input);

  assert.equal(row.cells.type, 'Dépense');
  assert.equal(row.cells.date, '2026-03-04');
  assert.equal(row.cells.proofs, 'contrat.pdf, echeancier.pdf');
  assert.equal(row.isAuto, true);

  const income = buildLedgerRow({ ...input, entryType: 'INCOME' });

  assert.equal(income.cells.type, 'Recette');
});

test('the system ledger declares its managed columns and leaves comment free', () => {
  assert.equal(LEDGER_SYSTEM_KEY, 'bilan.default.ledger');
  assert.ok(MANAGED_LEDGER_COLUMN_IDS.includes('amount'));
  assert.ok(!MANAGED_LEDGER_COLUMN_IDS.includes('comment'));
  assert.equal(LEDGER_COLUMNS.length, 10);
});

test('a replay overwrites managed cells but keeps the human comment', () => {
  const merged = mergeLedgerCells(
    { comment: 'Vérifié par le trésorier', amount: 1, label: 'Ancien libellé' },
    buildLedgerRow(input).cells,
  );

  assert.equal(merged.comment, 'Vérifié par le trésorier');
  assert.equal(merged.label, 'Assurance RC');
  assert.equal(merged.amount, 240_000_000);
});

test('a merge on a row that never had a comment yields an empty comment', () => {
  const merged = mergeLedgerCells(undefined, buildLedgerRow(input).cells);

  assert.equal(merged.comment, '');
});

test('a locked period rejects entries dated on or before the lock', () => {
  assert.equal(isLedgerPeriodLocked('2026-12-31', '2026-03-04T00:00:00Z'), true);
  assert.equal(isLedgerPeriodLocked('2026-12-31', '2027-01-02T00:00:00Z'), false);
  assert.equal(isLedgerPeriodLocked(undefined, '2026-03-04T00:00:00Z'), false);
});

test('the CSV export escapes separators and quotes', () => {
  const csv = toCsv(
    [
      { id: 'label', name: 'Libellé', type: 'text', width: 10, isManaged: true },
      { id: 'amount', name: 'Montant', type: 'currency', width: 10, isManaged: true },
    ],
    [{ label: 'Achat; "urgent"', amount: 12 }],
  );

  assert.equal(csv, 'Libellé;Montant\n"Achat; ""urgent""";12');
});
