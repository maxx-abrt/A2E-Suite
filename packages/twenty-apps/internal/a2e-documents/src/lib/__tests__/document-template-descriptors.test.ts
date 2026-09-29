import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isTemplateDescriptor,
  validateTemplateDescriptors,
} from 'twenty-shared/application';

import {
  DOCUMENTS_TEMPLATE_CATEGORY,
  buildDocumentTemplateDescriptors,
} from '../document-template-descriptors.ts';
import { STARTER_DOCUMENT_TEMPLATES } from '../starter-templates.ts';

const descriptors = buildDocumentTemplateDescriptors();

test('Documents exposes one C1 descriptor per shipped page template', () => {
  assert.equal(descriptors.length, STARTER_DOCUMENT_TEMPLATES.length);
  assert.ok(descriptors.every(isTemplateDescriptor));
  assert.equal(validateTemplateDescriptors(descriptors).valid, true);
  assert.equal(DOCUMENTS_TEMPLATE_CATEGORY, 'Pages');
});

test('every page descriptor carries non-empty fr+en labels', () => {
  for (const descriptor of descriptors) {
    assert.ok(descriptor.labels.fr.trim().length > 0);
    assert.ok(descriptor.labels.en.trim().length > 0);
  }
});

test('page templates require no sibling app — Documents owns the document object', () => {
  assert.ok(descriptors.every((descriptor) => descriptor.requiredApps.length === 0));
});

test('applying a page template previews exactly one document write', () => {
  for (const descriptor of descriptors) {
    assert.deepEqual(
      descriptor.preview.map((write) => [write.object, write.count]),
      [['document', 1]],
    );
  }
});

test('page descriptor keys are stable slugs and unique', () => {
  const keys = descriptors.map((descriptor) => descriptor.key);

  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.every((key) => /^[a-z0-9-]+$/.test(key)));

  const titles = descriptors.map((descriptor) => descriptor.labels.fr);
  assert.ok(titles.includes('Notes de réunion'));
});
