import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  computeDocumentTotals,
  computeLineTotals,
  remainingToPay,
} from '../vat.ts';
import { moneyFromAmount, toMicros } from '../money.ts';

test('exclusive VAT adds tax on top of the net line', () => {
  const totals = computeLineTotals(
    { quantity: 2, unitPriceMicros: toMicros(100), vatRate: 20 },
    'EXCLUSIVE',
  );

  assert.equal(totals.netMicros, toMicros(200));
  assert.equal(totals.vatMicros, toMicros(40));
  assert.equal(totals.grossMicros, toMicros(240));
});

test('inclusive VAT extracts tax from the gross line', () => {
  const totals = computeLineTotals(
    { quantity: 1, unitPriceMicros: toMicros(120), vatRate: 20 },
    'INCLUSIVE',
  );

  assert.equal(totals.netMicros, toMicros(100));
  assert.equal(totals.vatMicros, toMicros(20));
  assert.equal(totals.grossMicros, toMicros(120));
});

test('exempt and reverse charge never invoice VAT', () => {
  for (const taxMode of ['EXEMPT', 'REVERSE_CHARGE'] as const) {
    const totals = computeLineTotals(
      { quantity: 3, unitPriceMicros: toMicros(50), vatRate: 20 },
      taxMode,
    );

    assert.equal(totals.vatMicros, 0);
    assert.equal(totals.vatRate, 0);
    assert.equal(totals.grossMicros, toMicros(150));
  }
});

test('line discount applies before VAT', () => {
  const totals = computeLineTotals(
    {
      quantity: 1,
      unitPriceMicros: toMicros(200),
      vatRate: 10,
      discountPercent: 25,
    },
    'EXCLUSIVE',
  );

  assert.equal(totals.netMicros, toMicros(150));
  assert.equal(totals.vatMicros, toMicros(15));
});

test('document totals split VAT by rate and match a hand calculation', () => {
  const totals = computeDocumentTotals(
    [
      { quantity: 1, unitPriceMicros: toMicros(100), vatRate: 20 },
      { quantity: 2, unitPriceMicros: toMicros(50), vatRate: 5.5 },
      { quantity: 1, unitPriceMicros: toMicros(30), vatRate: 0 },
    ],
    'EXCLUSIVE',
  );

  assert.equal(totals.subtotal.amountMicros, toMicros(230));
  assert.equal(totals.tax.amountMicros, toMicros(20 + 5.5));
  assert.equal(totals.total.amountMicros, toMicros(255.5));
  assert.deepEqual(
    totals.vatByRate.map((bucket) => bucket.vatRate),
    [0, 5.5, 20],
  );
});

test('a rate that yields fractions of a cent stays exact in micros', () => {
  const totals = computeDocumentTotals(
    [{ quantity: 3, unitPriceMicros: toMicros(19.99), vatRate: 2.1 }],
    'EXCLUSIVE',
  );

  assert.equal(totals.subtotal.amountMicros, 59_970_000);
  assert.equal(totals.tax.amountMicros, 1_259_370);
});

test('empty documents total to zero, not NaN', () => {
  const totals = computeDocumentTotals([], 'EXCLUSIVE');

  assert.equal(totals.total.amountMicros, 0);
  assert.deepEqual(totals.vatByRate, []);
});

test('remaining to pay never goes negative on an overpayment', () => {
  const remaining = remainingToPay(moneyFromAmount(100), toMicros(150));

  assert.equal(remaining.amountMicros, 0);
});
