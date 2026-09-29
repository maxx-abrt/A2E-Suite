import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isTemplateDescriptor,
  validateTemplateDescriptors,
} from 'twenty-shared/application';

import {
  FOLDER_STRUCTURE_TEMPLATES,
  flattenFolderStructureTemplate,
} from '../folder-structure-templates.ts';
import {
  ARCHIVE_TEMPLATE_CATEGORY,
  buildFolderStructureDescriptors,
} from '../folder-structure-descriptors.ts';

const descriptors = buildFolderStructureDescriptors();

test('Archive exposes one C1 descriptor per shipped folder structure', () => {
  assert.equal(descriptors.length, FOLDER_STRUCTURE_TEMPLATES.length);
  assert.ok(descriptors.every(isTemplateDescriptor));
  assert.equal(validateTemplateDescriptors(descriptors).valid, true);
  assert.equal(ARCHIVE_TEMPLATE_CATEGORY, 'Archive');
});

test('every folder descriptor carries non-empty fr+en labels', () => {
  for (const descriptor of descriptors) {
    assert.ok(descriptor.labels.fr.trim().length > 0);
    assert.ok(descriptor.labels.en.trim().length > 0);
    assert.notEqual(descriptor.labels.fr, descriptor.labels.en);
  }
});

test('folder structures require no sibling app — Archive owns driveFolder', () => {
  assert.ok(descriptors.every((descriptor) => descriptor.requiredApps.length === 0));
});

test('each preview declares the exact driveFolder count and nothing else', () => {
  for (const [index, descriptor] of descriptors.entries()) {
    const folderStructure = FOLDER_STRUCTURE_TEMPLATES[index];

    assert.ok(folderStructure, 'descriptor order must mirror the bundle');

    assert.deepEqual(
      descriptor.preview.map((write) => [write.object, write.count]),
      [['driveFolder', flattenFolderStructureTemplate(folderStructure).length]],
    );
  }
});
