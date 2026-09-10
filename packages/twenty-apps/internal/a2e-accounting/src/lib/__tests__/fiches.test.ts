import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  balanceMessage,
  computeBudgetEquilibre,
  prefillFromRealised,
} from '../budget-equilibre.ts';
import { FICHE_TEMPLATES, withTemplateDefaults, getFicheTemplate, FICHE_TEMPLATE_KEYS } from '../fiche-templates.ts';

test('the eight official templates are all registered with a payload', () => {
  assert.equal(FICHE_TEMPLATE_KEYS.length, 8);

  for (const key of FICHE_TEMPLATE_KEYS) {
    const template = FICHE_TEMPLATES[key];

    assert.equal(template.key, key);
    assert.ok(template.defaultTitle.length > 0);
    assert.ok(template.sections.length > 0);
    assert.ok(typeof template.defaultData === 'object');
  }
});

test('an unknown template key resolves to undefined instead of throwing', () => {
  assert.equal(getFicheTemplate('NOT_A_TEMPLATE'), undefined);
});

test('stored payloads win over defaults and missing keys are backfilled', () => {
  const data = withTemplateDefaults('BUDGET_EQUILIBRE', { year: '2019' });

  assert.equal(data.year, '2019');
  assert.equal(data.scope, 'Budget prévisionnel annuel');
  assert.ok(Array.isArray(data.charges));
});

test('backfilling never shares the template array between two fiches', () => {
  const first = withTemplateDefaults('BUDGET_EQUILIBRE', {}) as {
    charges: { amount: number }[];
  };
  const second = withTemplateDefaults('BUDGET_EQUILIBRE', {}) as {
    charges: { amount: number }[];
  };

  first.charges[0].amount = 999;

  assert.equal(second.charges[0].amount, 0);
});

test('an unknown template returns the stored payload untouched', () => {
  assert.deepEqual(withTemplateDefaults('NOPE', { a: 1 }), { a: 1 });
  assert.deepEqual(withTemplateDefaults('NOPE', undefined), {});
});

test('the PCG grids seed the budget template', () => {
  const template = FICHE_TEMPLATES.BUDGET_EQUILIBRE.defaultData as {
    charges: { label: string }[];
    produits: { label: string }[];
  };

  assert.ok(template.charges[0].label.startsWith('60 —'));
  assert.ok(template.produits.some((line) => line.label.startsWith('74 —')));
});

test('a balanced budget reports no gap', () => {
  const totals = computeBudgetEquilibre(
    [{ label: '60', amount: 600 }, { label: '64', amount: 400 }],
    [{ label: '74', amount: 1000 }],
  );

  assert.equal(totals.chargesTotal, 1000);
  assert.equal(totals.produitsTotal, 1000);
  assert.equal(totals.gap, 0);
  assert.equal(totals.isBalanced, true);
  assert.equal(totals.side, 'BALANCED');
  assert.equal(balanceMessage(totals), 'Budget à l’équilibre.');
});

test('a deficit names the missing produits', () => {
  const totals = computeBudgetEquilibre(
    [{ label: '60', amount: 1200 }],
    [{ label: '74', amount: 1000 }],
  );

  assert.equal(totals.gap, -200);
  assert.equal(totals.side, 'CHARGES_HEAVY');
  assert.match(balanceMessage(totals), /manque/);
});

test('an excess asks to add charges', () => {
  const totals = computeBudgetEquilibre(
    [{ label: '60', amount: 800 }],
    [{ label: '74', amount: 1000 }],
  );

  assert.equal(totals.gap, 200);
  assert.equal(totals.side, 'PRODUITS_HEAVY');
  assert.match(balanceMessage(totals), /Excédent/);
});

test('cents survive the totals without floating point drift', () => {
  const totals = computeBudgetEquilibre(
    [{ label: 'a', amount: 0.1 }, { label: 'b', amount: 0.2 }],
    [{ label: 'c', amount: 0.3 }],
  );

  assert.equal(totals.chargesTotal, 0.3);
  assert.equal(totals.isBalanced, true);
});

test('empty and malformed grids total to zero', () => {
  const totals = computeBudgetEquilibre(undefined, [
    { label: 'x', amount: Number.NaN },
  ]);

  assert.equal(totals.chargesTotal, 0);
  assert.equal(totals.produitsTotal, 0);
});

test('prefill routes real categories onto their PCG line and keeps the rest', () => {
  const filled = prefillFromRealised(
    [
      { label: '60 — Achats', amount: 0 },
      { label: '64 — Charges de personnel', amount: 0 },
    ],
    [{ label: "74 — Subventions d'exploitation", amount: 0 }],
    {
      expenseByCategory: [
        { label: 'Fournitures', amountMicros: 150_000_000 },
        { label: 'Salaires', amountMicros: 900_000_000 },
        { label: 'Frais bancaires', amountMicros: 12_000_000 },
      ],
      incomeByCategory: [{ label: 'Subvention FDVA', amountMicros: 500_000_000 }],
    },
    {
      Fournitures: '606',
      Salaires: '641',
      'Subvention FDVA': '740',
    },
  );

  assert.equal(filled.charges[0].amount, 150);
  assert.equal(filled.charges[1].amount, 900);
  assert.deepEqual(filled.charges[2], { label: 'Frais bancaires', amount: 12 });
  assert.equal(filled.produits[0].amount, 500);
});
