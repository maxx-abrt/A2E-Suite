import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type ViewManifest } from 'twenty-shared/application';
import {
  ViewFilterGroupLogicalOperator,
  ViewFilterOperand,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  buildBoardViewFromTemplatePayload,
  buildBoardViewTemplateCopyTitle,
  buildSaveBoardViewAsTemplatePayload,
  buildSaveBoardViewAsTemplateTitle,
} from '../save-board-view-as-template.ts';

const buildSourceView = (): ViewManifest => ({
  universalIdentifier: 'view-uuid',
  name: 'Board tâches',
  objectUniversalIdentifier: 'task-object-uuid',
  type: ViewType.KANBAN,
  mainGroupByFieldMetadataUniversalIdentifier: 'status-field-uuid',
  fields: [
    {
      universalIdentifier: 'field-1',
      fieldMetadataUniversalIdentifier: 'title-field-uuid',
      position: 0,
    },
    {
      universalIdentifier: 'field-2',
      fieldMetadataUniversalIdentifier: 'status-field-uuid',
      position: 1,
      viewFieldGroupUniversalIdentifier: 'field-group-1',
    },
  ],
  filterGroups: [
    {
      universalIdentifier: 'filter-group-1',
      logicalOperator: ViewFilterGroupLogicalOperator.AND,
    },
  ],
  filters: [
    {
      universalIdentifier: 'filter-1',
      fieldMetadataUniversalIdentifier: 'project-field-uuid',
      operand: ViewFilterOperand.IS_NOT_EMPTY,
      value: '',
      viewFilterGroupUniversalIdentifier: 'filter-group-1',
    },
  ],
  groups: [
    { universalIdentifier: 'group-1', fieldValue: 'TODO', position: 0 },
  ],
  sorts: [
    {
      universalIdentifier: 'sort-1',
      fieldMetadataUniversalIdentifier: 'title-field-uuid',
      direction: ViewSortDirection.ASC,
    },
  ],
});

test('the save-as-template name adds the template prefix once', () => {
  assert.equal(
    buildSaveBoardViewAsTemplateTitle('Board tâches'),
    'Modèle — Board tâches',
  );
  assert.equal(
    buildSaveBoardViewAsTemplateTitle('Modèle — Board tâches'),
    'Modèle — Board tâches',
  );
  assert.equal(buildSaveBoardViewAsTemplateTitle(''), 'Modèle — Tableau');
});

test('the copy name strips the template prefix', () => {
  assert.equal(buildBoardViewTemplateCopyTitle('Modèle — Board tâches'), 'Board tâches');
  assert.equal(buildBoardViewTemplateCopyTitle('Modèle — '), 'Tableau');
});

test('the save payload marks the view as a template and clones it', () => {
  const source = buildSourceView();
  const template = buildSaveBoardViewAsTemplatePayload(source);

  assert.equal(template.view.isTemplate, true);
  assert.equal(template.view.name, 'Modèle — Board tâches');
  assert.equal(template.view.type, ViewType.KANBAN);

  if (source.fields !== undefined) {
    source.fields[0].position = 99;
  }

  assert.equal(template.view.fields?.[0].position, 0);
});

test('instantiation mints fresh ids and rewrites every group reference', () => {
  const template = buildSaveBoardViewAsTemplatePayload(buildSourceView());
  let cursor = 0;
  const createUniversalIdentifier = () => `fresh-${cursor++}`;

  const copy = buildBoardViewFromTemplatePayload(template, {
    createUniversalIdentifier,
  });

  assert.equal(copy.name, 'Board tâches');
  assert.equal(copy.isTemplate, false);
  assert.equal(copy.universalIdentifier, 'fresh-0');
  assert.ok(
    copy.universalIdentifier !== template.view.universalIdentifier,
    'the copy aliases the template view id',
  );

  const copiedFieldGroupId = copy.filterGroups?.[0].universalIdentifier;
  const copiedFieldIds = (copy.fields ?? []).map((field) => field.universalIdentifier);
  const copiedFilterId = copy.filters?.[0].universalIdentifier;
  const copiedGroupId = copy.groups?.[0].universalIdentifier;
  const copiedSortId = copy.sorts?.[0].universalIdentifier;

  const allIds = [
    copy.universalIdentifier,
    copiedFieldGroupId,
    ...copiedFieldIds,
    copiedFilterId,
    copiedGroupId,
    copiedSortId,
  ];

  assert.equal(new Set(allIds).size, allIds.length, 'duplicate fresh id');
  assert.ok(allIds.every((id) => (id ?? '').startsWith('fresh-')));

  // The filter still points at the copy's own filter group, not the template's.
  assert.equal(copy.filters?.[0].viewFilterGroupUniversalIdentifier, copiedFieldGroupId);
});

test('a dangling group reference is dropped instead of copied through', () => {
  const source = buildSourceView();
  source.filters = [
    {
      universalIdentifier: 'filter-1',
      fieldMetadataUniversalIdentifier: 'project-field-uuid',
      operand: ViewFilterOperand.IS_NOT_EMPTY,
      value: '',
      viewFilterGroupUniversalIdentifier: 'ghost-group',
    },
  ];

  const template = buildSaveBoardViewAsTemplatePayload(source);
  const copy = buildBoardViewFromTemplatePayload(template, {
    createUniversalIdentifier: () => 'fresh',
  });

  assert.equal(copy.filters?.[0].viewFilterGroupUniversalIdentifier, undefined);
});

test('instantiating twice produces two independent view id sets', () => {
  const template = buildSaveBoardViewAsTemplatePayload(buildSourceView());

  const first = buildBoardViewFromTemplatePayload(template, {
    createUniversalIdentifier: () => 'first',
  });
  const second = buildBoardViewFromTemplatePayload(template, {
    createUniversalIdentifier: () => 'second',
  });

  assert.notEqual(first.universalIdentifier, second.universalIdentifier);
  assert.equal(first.name, second.name);
  assert.equal(template.view.isTemplate, true);
});
