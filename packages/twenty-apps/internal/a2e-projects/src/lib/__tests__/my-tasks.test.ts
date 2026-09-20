import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  NavigationMenuItemType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  SELECT_FILTER_VALUE_DONE,
  TASK_FIELD_IDS,
  VIEW_IDS,
} from '../../constants/universal-identifiers.ts';
import { readTaskPipelineStatus } from '../task-status.ts';

type ViewFilterDefinition = {
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;
  subFieldName?: string;
  operand: string;
  value: unknown;
};

type ViewDefinition = {
  universalIdentifier: string;
  name: string;
  objectUniversalIdentifier: string;
  type?: ViewType;
  fields?: { fieldMetadataUniversalIdentifier: string }[];
  filters?: ViewFilterDefinition[];
};

type NavigationMenuItemDefinition = {
  universalIdentifier: string;
  name: string;
  type: NavigationMenuItemType;
  position: number;
  viewUniversalIdentifier?: string;
  folderUniversalIdentifier?: string;
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
};

// The native status the app never moves — the smart lists must NOT read it.
const NATIVE_TASK_STATUS_FIELD_ID = '20202020-70bc-48f9-89c5-6aa730b151e0';

const CREATED_BY_FIELD_ID =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.fields.createdBy
    .universalIdentifier;

const CURRENT_WORKSPACE_MEMBER_VALUE = JSON.stringify({
  isCurrentWorkspaceMemberSelected: true,
  selectedRecordIds: [],
});

const SMART_LIST_VIEWS = [
  {
    path: '../../views/my-tasks.view.ts',
    viewId: VIEW_IDS.taskMyTasks,
    name: 'Assignées à moi',
  },
  {
    path: '../../views/created-by-me.view.ts',
    viewId: VIEW_IDS.taskCreatedByMe,
    name: 'Créées par moi',
  },
  {
    path: '../../views/overdue-tasks.view.ts',
    viewId: VIEW_IDS.taskOverdue,
    name: 'En retard',
  },
];

test('the three smart lists are TABLE views on the standard task object', async () => {
  for (const smartList of SMART_LIST_VIEWS) {
    const view = await unwrap<ViewDefinition>(smartList.path);

    assert.equal(view.universalIdentifier, smartList.viewId);
    assert.equal(view.name, smartList.name);
    assert.equal(view.type, ViewType.TABLE);
    assert.equal(
      view.objectUniversalIdentifier,
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
    );
  }
});

test('the assigned-to-me list filters the native assignee on the current member', async () => {
  const view = await unwrap<ViewDefinition>('../../views/my-tasks.view.ts');
  const assigneeFilter = (view.filters ?? []).find(
    (filter) =>
      filter.fieldMetadataUniversalIdentifier ===
      NATIVE_TASK_FIELD_IDS.assignee,
  );

  assert.ok(assigneeFilter, 'assigned-to-me has no assignee filter');
  assert.equal(assigneeFilter.operand, ViewFilterOperand.IS);
  assert.equal(assigneeFilter.value, CURRENT_WORKSPACE_MEMBER_VALUE);
});

test('the created-by-me list filters the ACTOR createdBy workspaceMemberId sub-field', async () => {
  const view = await unwrap<ViewDefinition>(
    '../../views/created-by-me.view.ts',
  );
  const createdByFilter = (view.filters ?? []).find(
    (filter) => filter.fieldMetadataUniversalIdentifier === CREATED_BY_FIELD_ID,
  );

  assert.ok(createdByFilter, 'created-by-me has no createdBy filter');
  assert.equal(createdByFilter.subFieldName, 'workspaceMemberId');
  assert.equal(createdByFilter.operand, ViewFilterOperand.IS);
  assert.equal(createdByFilter.value, CURRENT_WORKSPACE_MEMBER_VALUE);
});

test('the overdue list is dueAt in the past on open (not DONE) tasks', async () => {
  const view = await unwrap<ViewDefinition>(
    '../../views/overdue-tasks.view.ts',
  );
  const dueAtFilter = (view.filters ?? []).find(
    (filter) =>
      filter.fieldMetadataUniversalIdentifier === NATIVE_TASK_FIELD_IDS.dueAt,
  );
  const statusFilter = (view.filters ?? []).find(
    (filter) => filter.value === SELECT_FILTER_VALUE_DONE,
  );

  assert.ok(dueAtFilter, 'overdue has no dueAt filter');
  assert.equal(dueAtFilter.operand, ViewFilterOperand.IS_IN_PAST);

  assert.ok(statusFilter, 'overdue has no DONE exclusion filter');
  assert.equal(statusFilter.operand, ViewFilterOperand.IS_NOT);
  assert.equal(
    statusFilter.fieldMetadataUniversalIdentifier,
    TASK_FIELD_IDS.projectStatus,
  );
});

test('every smart list reads the board pipeline status, never the native task status', async () => {
  for (const smartList of SMART_LIST_VIEWS) {
    const view = await unwrap<ViewDefinition>(smartList.path);
    const statusColumn = (view.fields ?? []).find(
      (viewField) =>
        viewField.fieldMetadataUniversalIdentifier ===
          NATIVE_TASK_STATUS_FIELD_ID ||
        viewField.fieldMetadataUniversalIdentifier ===
          TASK_FIELD_IDS.projectStatus,
    );

    assert.ok(statusColumn, `${smartList.name} exposes no status column`);
    assert.equal(
      statusColumn.fieldMetadataUniversalIdentifier,
      TASK_FIELD_IDS.projectStatus,
      `${smartList.name} still displays the native task status`,
    );
  }
});

test('a task completed on the pipeline reads done while its native status stays TODO', () => {
  assert.equal(
    readTaskPipelineStatus({ status: 'TODO', projectStatus: 'DONE' }),
    'DONE',
  );
  assert.equal(
    readTaskPipelineStatus({ status: 'DONE', projectStatus: 'TODO' }),
    'TODO',
  );
});

test('the reserved position-120 nav item is a folder grouping the three smart lists', async () => {
  const folder = await unwrap<NavigationMenuItemDefinition>(
    '../../navigation-menu-items/my-tasks.navigation-menu-item.ts',
  );

  assert.equal(folder.universalIdentifier, NAVIGATION_MENU_ITEM_IDS.myTasks);
  assert.equal(folder.type, NavigationMenuItemType.FOLDER);
  assert.equal(folder.position, 120);

  const children = [
    {
      path: '../../navigation-menu-items/my-tasks-assigned.navigation-menu-item.ts',
      navId: NAVIGATION_MENU_ITEM_IDS.myTasksAssigned,
      viewId: VIEW_IDS.taskMyTasks,
    },
    {
      path: '../../navigation-menu-items/my-tasks-created.navigation-menu-item.ts',
      navId: NAVIGATION_MENU_ITEM_IDS.myTasksCreated,
      viewId: VIEW_IDS.taskCreatedByMe,
    },
    {
      path: '../../navigation-menu-items/my-tasks-overdue.navigation-menu-item.ts',
      navId: NAVIGATION_MENU_ITEM_IDS.myTasksOverdue,
      viewId: VIEW_IDS.taskOverdue,
    },
  ];

  for (const [index, child] of children.entries()) {
    const item = await unwrap<NavigationMenuItemDefinition>(child.path);

    assert.equal(item.universalIdentifier, child.navId);
    assert.equal(item.type, NavigationMenuItemType.VIEW);
    assert.equal(item.folderUniversalIdentifier, folder.universalIdentifier);
    assert.equal(item.viewUniversalIdentifier, child.viewId);
    assert.equal(item.position, index);
  }
});
