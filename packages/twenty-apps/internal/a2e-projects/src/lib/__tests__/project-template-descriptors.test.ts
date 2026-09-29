import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isTemplateDescriptor,
  validateTemplateDescriptors,
} from 'twenty-shared/application';

import {
  PROJECTS_TEMPLATE_CATEGORY,
  buildProjectTemplateDescriptors,
} from '../project-template-descriptors.ts';
import { STARTER_PROJECT_TEMPLATES } from '../starter-projects.ts';

const descriptors = buildProjectTemplateDescriptors();

test('Projects exposes one C1 descriptor per shipped project template', () => {
  assert.equal(descriptors.length, STARTER_PROJECT_TEMPLATES.length);
  assert.ok(descriptors.every(isTemplateDescriptor));
  assert.equal(validateTemplateDescriptors(descriptors).valid, true);
  assert.equal(PROJECTS_TEMPLATE_CATEGORY, 'Projets');
});

test('every project descriptor carries non-empty fr+en labels and keeps its stable key', () => {
  const keyByFr = new Map(
    descriptors.map((descriptor) => [descriptor.labels.fr, descriptor.key]),
  );

  for (const descriptor of descriptors) {
    assert.ok(descriptor.labels.fr.trim().length > 0);
    assert.ok(descriptor.labels.en.trim().length > 0);
    assert.ok(/^[A-Z]{3}$/.test(descriptor.key));
  }

  assert.equal(
    keyByFr.size,
    STARTER_PROJECT_TEMPLATES.length,
    'project labels must stay unique so the map is lossless',
  );
});

test('project templates require no sibling app — Projects owns project/task/milestone', () => {
  assert.ok(descriptors.every((descriptor) => descriptor.requiredApps.length === 0));
});

test('each descriptor previews one project plus its real task and milestone counts', () => {
  for (const [index, descriptor] of descriptors.entries()) {
    const starter = STARTER_PROJECT_TEMPLATES[index];

    assert.ok(starter, 'descriptor order must mirror the starter bundle');

    assert.deepEqual(
      descriptor.preview.map((write) => [write.object, write.count]),
      [
        ['project', 1],
        ['task', starter.tasks.length],
        ['milestone', starter.milestones.length],
      ].filter(([, count]) => Number(count) > 0),
    );
  }
});

test('the grant-application template notes its Bilan link without requiring Bilan', () => {
  const grantDescriptor = descriptors.find(
    (descriptor) => descriptor.key === 'SUB',
  );

  assert.ok(grantDescriptor, 'the grant-application template must ship');
  assert.deepEqual(grantDescriptor.requiredApps, []);
});
