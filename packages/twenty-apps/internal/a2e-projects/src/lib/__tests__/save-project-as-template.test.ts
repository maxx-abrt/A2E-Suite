import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildProjectFromTemplatePayload,
  buildProjectTemplateCopyTitle,
  buildSaveProjectAsTemplatePayload,
  buildSaveProjectAsTemplateTitle,
} from '../save-project-as-template.ts';

test('the save-as-template title adds the template prefix', () => {
  assert.equal(
    buildSaveProjectAsTemplateTitle('Refonte du site'),
    'Modèle — Refonte du site',
  );
});

test('an already-prefixed project title is not double-prefixed', () => {
  assert.equal(
    buildSaveProjectAsTemplateTitle('Modèle — Sprint'),
    'Modèle — Sprint',
  );
});

test('an empty project title falls back to the default template title', () => {
  assert.equal(
    buildSaveProjectAsTemplateTitle('   '),
    'Modèle — Nouveau projet',
  );
});

test('the copy title strips the template prefix and falls back when empty', () => {
  assert.equal(buildProjectTemplateCopyTitle('Modèle — Sprint'), 'Sprint');
  assert.equal(buildProjectTemplateCopyTitle('Modèle — '), 'Nouveau projet');
});

test('the save payload marks the project as a template and snapshots its tasks', () => {
  const payload = buildSaveProjectAsTemplatePayload({
    name: 'Refonte du site',
    key: 'WEB',
    status: 'ACTIVE',
    health: 'ON_TRACK',
    description: { markdown: '# Refonte' },
    tasks: [
      { id: 'task-1', title: 'Cadrer', projectStatus: 'DONE' },
      { id: 'task-2', title: 'Construire', projectStatus: 'TODO' },
    ],
  });

  assert.deepEqual(payload, {
    project: {
      name: 'Modèle — Refonte du site',
      key: 'WEB',
      status: 'ACTIVE',
      health: 'ON_TRACK',
      description: { markdown: '# Refonte' },
      isTemplate: true,
    },
    tasks: [
      {
        sourceId: 'task-1',
        title: 'Cadrer',
        projectStatus: 'DONE',
        parentTaskSourceId: null,
        milestoneSourceId: null,
        blockedByTaskSourceIds: [],
      },
      {
        sourceId: 'task-2',
        title: 'Construire',
        projectStatus: 'TODO',
        parentTaskSourceId: null,
        milestoneSourceId: null,
        blockedByTaskSourceIds: [],
      },
    ],
  });
});

test('a project without tasks or relations yields a safe empty snapshot', () => {
  const payload = buildSaveProjectAsTemplatePayload({ name: 'Vierge' });

  assert.deepEqual(payload.tasks, []);
  assert.deepEqual(payload.project.description, { markdown: null });
  assert.equal(payload.project.key, null);
});

test('mutating the source task list after saving never mutates the template', () => {
  const tasks = [
    {
      id: 'task-1',
      title: 'Cadrer',
      projectStatus: 'DONE' as const,
      blockedByTaskIds: ['task-2'],
    },
  ];

  const payload = buildSaveProjectAsTemplatePayload({ name: 'P', tasks });

  tasks[0].title = 'renamed';
  tasks[0].blockedByTaskIds.push('task-3');

  assert.equal(payload.tasks[0].title, 'Cadrer');
  assert.deepEqual(payload.tasks[0].blockedByTaskSourceIds, ['task-2']);
});

test('instantiation mints fresh task ids and rewrites internal relations', () => {
  const template = buildSaveProjectAsTemplatePayload({
    name: 'Refonte du site',
    tasks: [
      { id: 'task-1', title: 'Cadrer', projectStatus: 'DONE' },
      {
        id: 'task-2',
        title: 'Construire',
        projectStatus: 'TODO',
        parentTaskId: 'task-1',
        blockedByTaskIds: ['task-1', 'ghost'],
      },
    ],
  });

  const sequentialIds = ['fresh-1', 'fresh-2'];
  let cursor = 0;

  const instance = buildProjectFromTemplatePayload(template, {
    projectId: 'project-copy',
    createTaskId: () => sequentialIds[cursor++] ?? `overflow-${cursor}`,
  });

  assert.equal(instance.project.name, 'Refonte du site');
  assert.equal(instance.project.isTemplate, false);
  assert.deepEqual(
    instance.tasks.map((task) => task.id),
    ['fresh-1', 'fresh-2'],
  );
  assert.ok(instance.tasks.every((task) => task.projectId === 'project-copy'));
  // The subtask and blocked-by edges point at the copy's task, never the
  // template row; the unknown 'ghost' reference is dropped.
  assert.equal(instance.tasks[1].parentTaskId, 'fresh-1');
  assert.deepEqual(instance.tasks[1].blockedByTaskIds, ['fresh-1']);
});

test('instantiating twice produces two independent task id sets', () => {
  const template = buildSaveProjectAsTemplatePayload({
    name: 'Sprint',
    tasks: [{ id: 'task-1', title: 'Cadrer', projectStatus: 'TODO' }],
  });

  const first = buildProjectFromTemplatePayload(template, {
    projectId: 'p1',
    createTaskId: () => 'first',
  });
  const second = buildProjectFromTemplatePayload(template, {
    projectId: 'p2',
    createTaskId: () => 'second',
  });

  assert.notEqual(first.tasks[0].id, second.tasks[0].id);
  assert.equal(first.project.name, second.project.name);
});
