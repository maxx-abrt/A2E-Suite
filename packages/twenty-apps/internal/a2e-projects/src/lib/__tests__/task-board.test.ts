import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
} from 'twenty-sdk/define';

import {
  TASK_FIELD_IDS,
  VIEW_IDS,
} from '../../constants/universal-identifiers.ts';

type SelectOption = {
  value: string;
  position: number;
};

type FieldDefinition = {
  universalIdentifier: string;
  objectUniversalIdentifier?: string;
  type: string;
  name: string;
  options?: SelectOption[];
};

type ViewFieldDefinition = {
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;
};

type ViewGroupDefinition = {
  universalIdentifier: string;
  fieldValue: string;
  position: number;
};

type ViewFilterDefinition = {
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;
  operand: string;
  value: unknown;
};

type ViewDefinition = {
  universalIdentifier: string;
  name: string;
  objectUniversalIdentifier: string;
  type?: ViewType;
  mainGroupByFieldMetadataUniversalIdentifier?: string;
  fields?: ViewFieldDefinition[];
  filters?: ViewFilterDefinition[];
  groups?: ViewGroupDefinition[];
};

type DefinitionResult<TDefinition> = {
  success: boolean;
  config: TDefinition;
  errors?: unknown[];
};

const unwrap = async <TDefinition>(
  modulePath: string,
): Promise<TDefinition> => {
  const module = (await import(modulePath)) as {
    default: DefinitionResult<TDefinition>;
  };

  assert.equal(
    module.default.success,
    true,
    `invalid definition: ${modulePath}`,
  );

  return module.default.config;
};

// Native standard task field uuids (twenty-shared STANDARD_OBJECT_FIELDS).
const NATIVE_TASK_FIELD_IDS = {
  title: '20202020-b386-4cb7-aa5a-08d4a4d92680',
  dueAt: '20202020-fd99-40da-951b-4cb9a352fce3',
  assignee: '20202020-065a-4f42-a906-e20422c1753f',
  status: '20202020-70bc-48f9-89c5-6aa730b151e0',
};

test('the task board is a native KANBAN view on the standard task object', async () => {
  const view = await unwrap<ViewDefinition>('../../views/task-board.view.ts');

  assert.equal(view.universalIdentifier, VIEW_IDS.taskBoard);
  assert.equal(view.type, ViewType.KANBAN);
  assert.equal(
    view.objectUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  );
});

test('the task board groups by the app taskProjectStatus select, not the native task status', async () => {
  const view = await unwrap<ViewDefinition>('../../views/task-board.view.ts');

  assert.equal(
    view.mainGroupByFieldMetadataUniversalIdentifier,
    TASK_FIELD_IDS.projectStatus,
  );
  assert.notEqual(
    view.mainGroupByFieldMetadataUniversalIdentifier,
    NATIVE_TASK_FIELD_IDS.status,
  );
});

test('the board groups exactly match the taskProjectStatus option values, in position order', async () => {
  const view = await unwrap<ViewDefinition>('../../views/task-board.view.ts');
  const statusField = await unwrap<FieldDefinition>(
    '../../fields/task-project-status.field.ts',
  );

  assert.equal(
    statusField.objectUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  );
  assert.equal(statusField.name, 'projectStatus');

  const optionValues = (statusField.options ?? [])
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((option) => option.value);

  const groupValues = (view.groups ?? [])
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((group) => group.fieldValue);

  assert.deepEqual(optionValues, ['TODO', 'IN_PROGRESS', 'DONE']);
  assert.deepEqual(groupValues, optionValues);
});

test('the board is project-scoped through the task project relation filter', async () => {
  const view = await unwrap<ViewDefinition>('../../views/task-board.view.ts');
  const projectFilter = (view.filters ?? []).find(
    (filter) =>
      filter.fieldMetadataUniversalIdentifier === TASK_FIELD_IDS.project,
  );

  assert.ok(projectFilter, 'board has no task project filter');
  assert.equal(projectFilter.operand, ViewFilterOperand.IS_NOT_EMPTY);
});

test('every board field reference resolves to a declared app or native task field', async () => {
  const view = await unwrap<ViewDefinition>('../../views/task-board.view.ts');

  const resolvableFieldIds = new Set<string>([
    ...Object.values(TASK_FIELD_IDS),
    ...Object.values(NATIVE_TASK_FIELD_IDS),
  ]);
  const unresolved: string[] = [];

  for (const [index, viewField] of (view.fields ?? []).entries()) {
    if (!resolvableFieldIds.has(viewField.fieldMetadataUniversalIdentifier)) {
      unresolved.push(
        `field[${index}] -> ${viewField.fieldMetadataUniversalIdentifier}`,
      );
    }
  }

  if (
    view.mainGroupByFieldMetadataUniversalIdentifier !== undefined &&
    !resolvableFieldIds.has(view.mainGroupByFieldMetadataUniversalIdentifier)
  ) {
    unresolved.push(
      `mainGroupBy -> ${view.mainGroupByFieldMetadataUniversalIdentifier}`,
    );
  }

  for (const [index, filter] of (view.filters ?? []).entries()) {
    if (!resolvableFieldIds.has(filter.fieldMetadataUniversalIdentifier)) {
      unresolved.push(
        `filter[${index}] -> ${filter.fieldMetadataUniversalIdentifier}`,
      );
    }
  }

  assert.deepEqual(unresolved, []);
});
