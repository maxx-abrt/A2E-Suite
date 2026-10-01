import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ViewFilterGroupLogicalOperator,
  ViewFilterOperand,
} from 'twenty-sdk/define';
import { DEFAULT_NUMBER_OF_GROUPS_LIMIT } from 'twenty-shared/constants';

import {
  SELECT_FILTER_VALUE_DONE,
  TASK_FIELD_IDS,
  VIEW_FILTER_GROUP_IDS,
  VIEW_IDS,
} from '../../constants/universal-identifiers.ts';
import {
  GROUP_BY_QUERY_COMPLEXITY_LIMIT,
  OBSERVED_DEFECT_COMPLEXITY,
  computeGroupByQueryComplexity,
  computeTaskCalendarGroupByComplexity,
  countTaskCalendarRelationFields,
} from '../task-calendar-complexity.ts';

// Native standard task field uuids (twenty-shared STANDARD_OBJECT_FIELDS).
const NATIVE_TASK_DUE_AT_FIELD_ID = '20202020-fd99-40da-951b-4cb9a352fce3';

type ViewFieldDefinition = {
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;
};

type ViewFilterDefinition = {
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;
  operand: string;
  value: unknown;
  viewFilterGroupUniversalIdentifier?: string;
  positionInViewFilterGroup?: number;
};

type ViewFilterGroupDefinition = {
  universalIdentifier: string;
  logicalOperator: ViewFilterGroupLogicalOperator;
};

type ViewDefinition = {
  universalIdentifier: string;
  fields?: ViewFieldDefinition[];
  filters?: ViewFilterDefinition[];
  filterGroups?: ViewFilterGroupDefinition[];
  calendarFieldMetadataUniversalIdentifier?: string;
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

const readCalendarView = async (): Promise<ViewDefinition> =>
  unwrap<ViewDefinition>('../../views/task-calendar.view.ts');

test('the task-calendar view selects no relation column (the P4.2 repair stays)', async () => {
  const view = await readCalendarView();

  assert.equal(view.universalIdentifier, VIEW_IDS.taskCalendar);
  assert.equal(
    countTaskCalendarRelationFields(view),
    0,
    'the project relation column must stay out of the view',
  );

  const fieldIds = (view.fields ?? []).map(
    (viewField) => viewField.fieldMetadataUniversalIdentifier,
  );

  assert.equal(
    fieldIds.includes(TASK_FIELD_IDS.project),
    false,
    'the project relation must not be a visible column',
  );
});

test('the calendar group-by target is the scalar dueAt field, not a relation', async () => {
  const view = await readCalendarView();

  assert.equal(
    view.calendarFieldMetadataUniversalIdentifier,
    NATIVE_TASK_DUE_AT_FIELD_ID,
  );
  assert.notEqual(
    view.calendarFieldMetadataUniversalIdentifier,
    TASK_FIELD_IDS.project,
  );
});

test('the GroupByTasks complexity stays under the server cap with headroom', async () => {
  const view = await readCalendarView();
  const complexity = computeTaskCalendarGroupByComplexity(view);
  const margin = GROUP_BY_QUERY_COMPLEXITY_LIMIT - complexity;

  assert.equal(
    complexity,
    1951,
    'the calibrated formula reproduces the repaired view complexity',
  );
  assert.ok(
    complexity <= GROUP_BY_QUERY_COMPLEXITY_LIMIT,
    `complexity ${complexity} exceeds the cap ${GROUP_BY_QUERY_COMPLEXITY_LIMIT}`,
  );
  assert.ok(
    margin >= 1,
    `no headroom under the cap (complexity ${complexity})`,
  );

  // The default group limit is what multiplies the relation-field count into
  // the complexity, so it is the variable that made the defect visible.
  assert.equal(
    computeGroupByQueryComplexity({ relationFieldCount: 38 }),
    1951,
  );
  assert.equal(DEFAULT_NUMBER_OF_GROUPS_LIMIT, 50);
});

test('a single relation column would re-break the cap (regression witness)', async () => {
  const view = await readCalendarView();

  // Re-add the project relation column the repair removed: the complexity
  // climbs by one full group-limit step, back over the cap — this is the live
  // 2026-09-24 defect.
  const preRepairComplexity = computeTaskCalendarGroupByComplexity({
    ...view,
    fields: [
      ...(view.fields ?? []),
      {
        universalIdentifier: 'regression-witness-project-column',
        fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.project,
      },
    ],
  });

  assert.equal(preRepairComplexity, OBSERVED_DEFECT_COMPLEXITY);
  assert.ok(
    preRepairComplexity > GROUP_BY_QUERY_COMPLEXITY_LIMIT,
    'the relation column must tip the query over the cap',
  );
});

test('the project scoping filter and the US-059 NULL completion group are unchanged', async () => {
  const view = await readCalendarView();

  const projectFilter = (view.filters ?? []).find(
    (filter) =>
      filter.fieldMetadataUniversalIdentifier === TASK_FIELD_IDS.project,
  );

  assert.ok(projectFilter, 'calendar lost its task project scope filter');
  assert.equal(projectFilter.operand, ViewFilterOperand.IS_NOT_EMPTY);

  const completionGroup = (view.filterGroups ?? []).find(
    (group) =>
      group.universalIdentifier === VIEW_FILTER_GROUP_IDS.taskCalendarCompletion,
  );

  assert.ok(completionGroup, 'calendar lost its completion filterGroup');
  assert.equal(completionGroup.logicalOperator, ViewFilterGroupLogicalOperator.OR);

  const completionFilters = (view.filters ?? []).filter(
    (filter) =>
      filter.viewFilterGroupUniversalIdentifier ===
      VIEW_FILTER_GROUP_IDS.taskCalendarCompletion,
  );

  assert.deepEqual(
    completionFilters.map((filter) => filter.operand).sort(),
    [ViewFilterOperand.IS_EMPTY, ViewFilterOperand.IS_NOT].sort(),
  );
  assert.deepEqual(
    completionFilters.map((filter) => filter.fieldMetadataUniversalIdentifier),
    [TASK_FIELD_IDS.projectStatus, TASK_FIELD_IDS.projectStatus],
  );

  const doneFilter = completionFilters.find(
    (filter) => filter.operand === ViewFilterOperand.IS_NOT,
  );

  assert.equal(doneFilter?.value, SELECT_FILTER_VALUE_DONE);
});
