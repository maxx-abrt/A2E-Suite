import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  INVOICE_PAID_LEDGER_RECIPE_KEY,
  WORKFLOW_RECIPE_DESCRIPTORS,
  getWorkflowRecipeDescriptor,
  listWorkflowRecipeDescriptors,
  validateWorkflowRecipeDescriptors,
  type WorkflowRecipeDescriptor,
} from '../workflow-recipes.ts';

// Le registre de la famille M9c : ≥ 6 recettes, dont les 2 existantes et la
// recette facture P7-gated reportée sans être construite. Le validateur garde
// la forme honnête (libellés bilingues, prévisualisation, aucune écriture
// facture/comptabilité tant que P7 est bloqué).

test('the family lists at least six recipes', () => {
  const descriptors = listWorkflowRecipeDescriptors();

  assert.ok(descriptors.length >= 6);
  assert.equal(descriptors.length, WORKFLOW_RECIPE_DESCRIPTORS.length);
  assert.deepEqual(validateWorkflowRecipeDescriptors(descriptors), {
    valid: true,
    errors: [],
  });
});

test('the two existing recipes and the three new ones are all listed', () => {
  for (const key of [
    'deal-won',
    'recurring-task-generator',
    'meeting-notes',
    'file-review',
    'task-due-reminder',
  ]) {
    const descriptor = getWorkflowRecipeDescriptor(key);

    assert.ok(descriptor, `${key} must be listed`);
    assert.equal(descriptor.status, 'READY');
    assert.ok(descriptor.preview.length >= 1);
    assert.notEqual(descriptor.labels.fr.trim(), '');
    assert.notEqual(descriptor.labels.en.trim(), '');
  }
});

test('the invoice-paid recipe stays deferred with P7, never built', () => {
  const descriptor = getWorkflowRecipeDescriptor(INVOICE_PAID_LEDGER_RECIPE_KEY);

  assert.ok(descriptor);
  assert.equal(descriptor.status, 'DEFERRED');
  assert.deepEqual(descriptor.preview, []);
  assert.equal(descriptor.deferral?.gatedBy, 'P7');
  assert.ok((descriptor.deferral?.reason.length ?? 0) > 0);
});

test('validation rejects a ready recipe that writes accounting (P7 blocked)', () => {
  const invoiceReady: WorkflowRecipeDescriptor = {
    key: INVOICE_PAID_LEDGER_RECIPE_KEY,
    version: 1,
    labels: { fr: 'x', en: 'x' },
    category: 'Test',
    requiredApps: [],
    status: 'READY',
    preview: [{ kind: 'CREATE_INVOICE', object: 'invoice', summary: { fr: 'f', en: 'e' } }],
  };

  const validation = validateWorkflowRecipeDescriptors([
    ...WORKFLOW_RECIPE_DESCRIPTORS.filter(
      (descriptor) => descriptor.status === 'READY',
    ),
    invoiceReady,
  ]);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('facture')));
});

test('validation rejects a family shorter than six or with missing labels', () => {
  const tooShort = validateWorkflowRecipeDescriptors([
    WORKFLOW_RECIPE_DESCRIPTORS[0]!,
  ]);

  assert.equal(tooShort.valid, false);
  assert.ok(tooShort.errors.some((error) => error.includes('six')));

  const unlabeled: WorkflowRecipeDescriptor = {
    ...WORKFLOW_RECIPE_DESCRIPTORS[0]!,
    labels: { fr: '', en: '' },
  };

  const validation = validateWorkflowRecipeDescriptors([
    ...WORKFLOW_RECIPE_DESCRIPTORS,
    unlabeled,
  ]);

  assert.ok(validation.errors.some((error) => error.includes('Libellés')));
});
