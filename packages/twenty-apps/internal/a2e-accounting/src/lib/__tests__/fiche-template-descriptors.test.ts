import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isTemplateDescriptor,
  validateTemplateDescriptors,
} from 'twenty-shared/application';

import { FICHE_TEMPLATE_KEYS } from '../fiche-templates.ts';
import {
  ACCOUNTING_TEMPLATE_CATEGORY,
  buildFicheTemplateDescriptors,
} from '../fiche-template-descriptors.ts';

const descriptors = buildFicheTemplateDescriptors();

test('Bilan exposes one C1 descriptor per registered fiche template', () => {
  assert.equal(descriptors.length, FICHE_TEMPLATE_KEYS.length);
  assert.deepEqual(
    descriptors.map((descriptor) => descriptor.key),
    FICHE_TEMPLATE_KEYS,
  );
  assert.ok(descriptors.every(isTemplateDescriptor));
  assert.equal(validateTemplateDescriptors(descriptors).valid, true);
  assert.equal(ACCOUNTING_TEMPLATE_CATEGORY, 'Bilan');
});

test('every fiche descriptor carries non-empty fr+en labels', () => {
  for (const descriptor of descriptors) {
    assert.ok(descriptor.labels.fr.trim().length > 0);
    assert.ok(descriptor.labels.en.trim().length > 0);
  }
});

test('fiche templates require no sibling app — Bilan owns the fiche object', () => {
  assert.ok(descriptors.every((descriptor) => descriptor.requiredApps.length === 0));
});

test('applying a fiche template previews exactly one fiche write', () => {
  for (const descriptor of descriptors) {
    assert.deepEqual(
      descriptor.preview.map((write) => [write.object, write.count]),
      [['fiche', 1]],
    );
  }
});

test('the freelancer kit is listed as a descriptor, never as a real transaction', () => {
  const kit = descriptors.find(
    (descriptor) => descriptor.key === 'KIT_FACTURATION_INDEPENDANT',
  );

  assert.ok(kit, 'the freelancer invoicing kit must be listed');
  assert.equal(kit.inputs.length, 0);
});
