import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildFinanceEntryLedgerInput,
  buildInvoiceLedgerInput,
} from '../ledger-source.ts';
import { buildLedgerRow } from '../ledger.ts';

const expense = {
  id: 'expense-1',
  label: 'Supplier invoice',
  entryType: 'EXPENSE' as const,
  entryDate: '2026-10-20T00:00:00Z',
  amount: { amountMicros: 120_000_000, currencyCode: 'EUR' },
  receipts: [{ label: 'supplier.pdf' }],
};

test('an uploaded invoice is not booked before its amount and payment date are reviewed', () => {
  assert.equal(
    buildFinanceEntryLedgerInput(
      { ...expense, entryDate: null, amount: null },
      expense.id,
    ),
    null,
  );
  assert.equal(
    buildFinanceEntryLedgerInput(
      { ...expense, amount: { amountMicros: 0 } },
      expense.id,
    ),
    null,
  );
  assert.equal(
    buildFinanceEntryLedgerInput(
      { ...expense, entryDate: 'invalid' },
      expense.id,
    ),
    null,
  );
  assert.equal(
    buildFinanceEntryLedgerInput(
      { ...expense, amount: { amountMicros: Number.NaN } },
      expense.id,
    ),
    null,
  );
});

test('reviewed expenses retain their native source and invoice filename in the book', () => {
  const input = buildFinanceEntryLedgerInput(expense, expense.id);
  assert.ok(input);
  const row = buildLedgerRow(input);
  assert.equal(row.sourceKey, 'FINANCE_ENTRY:expense-1');
  assert.equal(row.cells.proofs, 'supplier.pdf');
  assert.equal(row.amount.amountMicros, 120_000_000);
  assert.equal(row.entryType, 'EXPENSE');
});

test('adding another receipt updates the same source key instead of creating a second posting', () => {
  const before = buildFinanceEntryLedgerInput(expense, expense.id);
  const after = buildFinanceEntryLedgerInput(
    { ...expense, receipts: [...expense.receipts, { label: 'receipt.png' }] },
    expense.id,
  );
  assert.ok(before && after);
  assert.equal(
    buildLedgerRow(before).sourceKey,
    buildLedgerRow(after).sourceKey,
  );
  assert.equal(buildLedgerRow(after).cells.proofs, 'supplier.pdf, receipt.png');
});

test('sales invoice attachments follow actual collections, not draft upload', () => {
  const invoice = {
    id: 'invoice-1',
    status: 'PAID',
    paidDate: '2026-10-20',
    amountPaid: { amountMicros: 50_000_000, currencyCode: 'EUR' },
    documents: [{ label: 'sale.pdf' }],
  };
  const input = buildInvoiceLedgerInput(invoice, invoice.id);
  assert.ok(input);
  assert.equal(buildLedgerRow(input).cells.proofs, 'sale.pdf');
  assert.equal(input.amountMicros, 50_000_000);
  assert.equal(
    buildInvoiceLedgerInput({ ...invoice, status: 'DRAFT' }, invoice.id),
    null,
  );
  assert.equal(
    buildInvoiceLedgerInput({ ...invoice, status: 'SENT' }, invoice.id),
    null,
  );
  assert.equal(
    buildInvoiceLedgerInput({ ...invoice, paidDate: null }, invoice.id),
    null,
  );
});
