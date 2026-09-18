import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewCalendarLayout,
  ViewFilterOperand,
  ViewType,
} from 'twenty-sdk/define';

import {
  TASK_FIELD_IDS,
  VIEW_IDS,
} from '../../constants/universal-identifiers.ts';

type ViewFieldDefinition = {
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;
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
  calendarFieldMetadataUniversalIdentifier?: string;
  calendarLayout?: ViewCalendarLayout;
  fields?: ViewFieldDefinition[];
  filters?: ViewFilterDefinition[];
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
  status: '20202020-70bc-48f9-89c5-6aa730b151e0',
};

test('the task calendar is a native CALENDAR view on the standard task object', async () => {
  const view = await unwrap<ViewDefinition>(
    '../../views/task-calendar.view.ts',
  );

  assert.equal(view.universalIdentifier, VIEW_IDS.taskCalendar);
  assert.equal(view.type, ViewType.CALENDAR);
  assert.equal(
    view.objectUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  );
});

test('the calendar places tasks by the native dueAt field, not a competing date field', async () => {
  const view = await unwrap<ViewDefinition>(
    '../../views/task-calendar.view.ts',
  );

  assert.equal(
    view.calendarFieldMetadataUniversalIdentifier,
    NATIVE_TASK_FIELD_IDS.dueAt,
  );
  assert.equal(view.calendarLayout, ViewCalendarLayout.MONTH);
});

test('the calendar is project-scoped through the task project relation filter', async () => {
  const view = await unwrap<ViewDefinition>(
    '../../views/task-calendar.view.ts',
  );
  const projectFilter = (view.filters ?? []).find(
    (filter) =>
      filter.fieldMetadataUniversalIdentifier === TASK_FIELD_IDS.project,
  );

  assert.ok(projectFilter, 'calendar has no task project filter');
  assert.equal(projectFilter.operand, ViewFilterOperand.IS_NOT_EMPTY);
});

test('every calendar field, filter and date reference resolves to a declared app or native task field', async () => {
  const view = await unwrap<ViewDefinition>(
    '../../views/task-calendar.view.ts',
  );

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

  for (const [index, filter] of (view.filters ?? []).entries()) {
    if (!resolvableFieldIds.has(filter.fieldMetadataUniversalIdentifier)) {
      unresolved.push(
        `filter[${index}] -> ${filter.fieldMetadataUniversalIdentifier}`,
      );
    }
  }

  if (
    view.calendarFieldMetadataUniversalIdentifier !== undefined &&
    !resolvableFieldIds.has(view.calendarFieldMetadataUniversalIdentifier)
  ) {
    unresolved.push(
      `calendarField -> ${view.calendarFieldMetadataUniversalIdentifier}`,
    );
  }

  assert.deepEqual(unresolved, []);
});
