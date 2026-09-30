import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildFicheFromTemplatePayload,
  buildFicheTemplateCopyTitle,
  buildSaveFicheAsTemplatePayload,
  buildSaveFicheAsTemplateTitle,
} from '../save-fiche-as-template.ts';

test('the save-as-template title adds the template prefix', () => {
  assert.equal(
    buildSaveFicheAsTemplateTitle('Budget prévisionnel'),
    'Modèle — Budget prévisionnel',
  );
});

test('an already-prefixed fiche title is not double-prefixed', () => {
  assert.equal(
    buildSaveFicheAsTemplateTitle('Modèle — Reçu fiscal'),
    'Modèle — Reçu fiscal',
  );
});

test('an empty fiche title falls back to the default template title', () => {
  assert.equal(
    buildSaveFicheAsTemplateTitle('   '),
    'Modèle — Nouvelle fiche',
  );
});

test('the save payload marks the fiche as a template and keeps only its layout', () => {
  const payload = buildSaveFicheAsTemplatePayload({
    title: 'Budget prévisionnel',
    templateKey: 'BUDGET_EQUILIBRE',
    subtitle: 'Exercice 2026',
    locale: 'FR',
    fiscalYear: '2026',
    data: { scope: 'Budget annuel', charges: [{ label: '60 — Achats', amount: 0 }] },
  });

  assert.deepEqual(payload, {
    title: 'Modèle — Budget prévisionnel',
    templateKey: 'BUDGET_EQUILIBRE',
    subtitle: 'Exercice 2026',
    locale: 'FR',
    fiscalYear: '2026',
    data: { scope: 'Budget annuel', charges: [{ label: '60 — Achats', amount: 0 }] },
    isTemplate: true,
  });
});

test('a fiche without a stored payload yields an empty data object', () => {
  const payload = buildSaveFicheAsTemplatePayload({ title: 'Vierge' });

  assert.deepEqual(payload.data, {});
  assert.equal(payload.templateKey, null);
});

test('the copy title strips the template prefix and falls back when empty', () => {
  assert.equal(
    buildFicheTemplateCopyTitle('Modèle — Reçu fiscal'),
    'Reçu fiscal',
  );
  assert.equal(buildFicheTemplateCopyTitle('Modèle — '), 'Nouvelle fiche');
});

test('instantiation strips the marker, the prefix and deep-clones the data', () => {
  const template = buildSaveFicheAsTemplatePayload({
    title: 'Budget prévisionnel',
    templateKey: 'BUDGET_EQUILIBRE',
    data: { charges: [{ label: '60 — Achats', amount: 0 }] },
  });

  const copy = buildFicheFromTemplatePayload(template);

  assert.equal(copy.title, 'Budget prévisionnel');
  assert.equal(copy.isTemplate, false);
  assert.deepEqual(copy.data, template.data);

  (copy.data.charges as { amount: number }[])[0].amount = 999;

  assert.equal(
    (template.data.charges as { amount: number }[])[0].amount,
    0,
    'the copy aliases the template data array',
  );
});

test('editing the source fiche data after saving never mutates the template', () => {
  const source = { title: 'P', data: { charges: [{ amount: 0 }] } };
  const template = buildSaveFicheAsTemplatePayload(source);

  (source.data.charges as { amount: number }[])[0].amount = 42;

  assert.equal(
    (template.data.charges as { amount: number }[])[0].amount,
    0,
  );
});
