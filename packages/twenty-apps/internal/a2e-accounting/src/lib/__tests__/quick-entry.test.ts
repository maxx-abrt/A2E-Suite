import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildQuickEntryRecordInput } from '../quick-entry.ts';

const input = {
  label: ' Supplies ',
  entryType: 'EXPENSE' as const,
  amount: '120,00',
  vatRate: '20',
  entryDate: '2026-10-20',
  paymentMethod: 'CARD',
  categoryId: 'office-category',
};

test('quick entry produces the native finance-entry shape with gross amount and included VAT', () => {
  assert.deepEqual(buildQuickEntryRecordInput(input), {
    label: 'Supplies',
    entryType: 'EXPENSE',
    amount: { amountMicros: 120_000_000, currencyCode: 'EUR' },
    entryDate: '2026-10-20T00:00:00.000Z',
    paymentMethod: 'CARD',
    vatRate: 20,
    vatAmount: { amountMicros: 20_000_000, currencyCode: 'EUR' },
    categoryId: 'office-category',
  });
});

test('supports decimal commas and spaces without accepting trailing junk', () => {
  assert.equal(
    buildQuickEntryRecordInput({ ...input, amount: '1 200,50' }).amount
      .amountMicros,
    1_200_500_000,
  );
  assert.throws(() =>
    buildQuickEntryRecordInput({ ...input, amount: '120oops' }),
  );
});

for (const override of [
  { amount: '0' },
  { amount: '-1' },
  { amount: 'Infinity' },
  { amount: '9007199254740992' },
  { label: '' },
  { entryDate: '2026-02-30' },
  { entryDate: '' },
  { vatRate: '101' },
]) {
  test(`rejects incomplete or invalid booking details: ${JSON.stringify(override)}`, () => {
    assert.throws(() => buildQuickEntryRecordInput({ ...input, ...override }));
  });
}
