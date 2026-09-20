import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ViewFilterGroupLogicalOperator,
  ViewFilterOperand,
} from 'twenty-sdk/define';
import {
  FieldMetadataType,
  RecordFilterGroupLogicalOperator,
  ViewFilterOperand as RecordFilterOperand,
} from 'twenty-shared/types';
import {
  computeRecordGqlOperationFilter,
  convertViewFilterValueToString,
} from 'twenty-shared/utils';
import {
  SELECT_FILTER_VALUE_DONE,
  TASK_FIELD_IDS,
  VIEW_FILTER_GROUP_IDS,
  VIEW_IDS,
} from '../../constants/universal-identifiers.ts';

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
  name: string;
  filters?: ViewFilterDefinition[];
  filterGroups?: ViewFilterGroupDefinition[];
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

// The two views that carry a DONE exclusion filter: the calendar and the
// overdue smart list. The board shows a NULL-status row in its ungrouped
// column, so these must not silently drop it.
const COMPLETION_FILTER_VIEWS = [
  {
    path: '../../views/task-calendar.view.ts',
    viewId: VIEW_IDS.taskCalendar,
    groupId: VIEW_FILTER_GROUP_IDS.taskCalendarCompletion,
  },
  {
    path: '../../views/overdue-tasks.view.ts',
    viewId: VIEW_IDS.taskOverdue,
    groupId: VIEW_FILTER_GROUP_IDS.taskOverdueCompletion,
  },
];

// The app projectStatus select, as the metadata the frontend resolver sees.
const projectStatusFieldMetadataItem = {
  id: TASK_FIELD_IDS.projectStatus,
  name: 'projectStatus',
  label: 'Statut',
  type: FieldMetadataType.SELECT,
};

// Replicates the frontend mapping (mapViewFiltersToFilters +
// mapViewFilterGroupsToRecordFilterGroups) closely enough to run the exact
// `computeRecordGqlOperationFilter` the real views run, then returns the
// computed GraphQL filter.
const computeViewGqlFilter = (
  view: ViewDefinition,
): Record<string, unknown> => {
  const filters = (view.filters ?? []).map((viewFilter) => ({
    fieldMetadataId: viewFilter.fieldMetadataUniversalIdentifier,
    value: convertViewFilterValueToString(viewFilter.value),
    operand: viewFilter.operand as RecordFilterOperand,
    type: 'SELECT' as const,
    recordFilterGroupId: viewFilter.viewFilterGroupUniversalIdentifier,
    positionInRecordFilterGroup: viewFilter.positionInViewFilterGroup,
  }));

  const recordFilterGroups = (view.filterGroups ?? []).map((group) => ({
    id: group.universalIdentifier,
    logicalOperator:
      group.logicalOperator === ViewFilterGroupLogicalOperator.OR
        ? RecordFilterGroupLogicalOperator.OR
        : RecordFilterGroupLogicalOperator.AND,
  }));

  return computeRecordGqlOperationFilter({
    recordFilters: filters,
    recordFilterGroups,
    fieldMetadataItems: [projectStatusFieldMetadataItem],
    filterValueDependencies: {},
  }) as Record<string, unknown>;
};

// Collects the (field, operand-shaped) leaves of the computed filter so a
// test can assert NULL inclusion without depending on the OR nesting depth.
const collectOrArms = (filter: Record<string, unknown>): unknown[] => {
  const arms: unknown[] = [filter];

  const orArms = filter.or;
  if (Array.isArray(orArms)) {
    for (const arm of orArms) {
      if (arm !== null && typeof arm === 'object') {
        arms.push(...collectOrArms(arm as Record<string, unknown>));
      }
    }
  }

  return arms;
};

test('the calendar completion filter is an OR group excluding DONE and keeping NULL', async () => {
  for (const target of COMPLETION_FILTER_VIEWS) {
    const view = await unwrap<ViewDefinition>(target.path);

    assert.equal(view.universalIdentifier, target.viewId);

    const group = (view.filterGroups ?? []).find(
      (candidate) => candidate.universalIdentifier === target.groupId,
    );

    assert.ok(group, `${view.name} has no completion filterGroup`);
    assert.equal(group.logicalOperator, ViewFilterGroupLogicalOperator.OR);

    const groupFilters = (view.filters ?? []).filter(
      (filter) => filter.viewFilterGroupUniversalIdentifier === target.groupId,
    );

    // Exactly the two completion operands live in the group: `IS NOT DONE`
    // and `IS EMPTY`. A third field (project scope, dueAt) must stay outside
    // so the group means "(NULL) OR (not DONE)", not a wider OR.
    assert.equal(
      groupFilters.length,
      2,
      `${view.name} completion group must hold exactly two filters`,
    );
    assert.deepEqual(
      groupFilters.map((filter) => filter.operand).sort(),
      [ViewFilterOperand.IS_EMPTY, ViewFilterOperand.IS_NOT].sort(),
    );
    for (const filter of groupFilters) {
      assert.equal(
        filter.fieldMetadataUniversalIdentifier,
        TASK_FIELD_IDS.projectStatus,
        `${view.name} completion group must read projectStatus`,
      );
    }

    assert.deepEqual(
      groupFilters.map((filter) => filter.positionInViewFilterGroup).sort(),
      [0, 1],
    );
  }
});

test('the computed calendar/overdue filter includes a projectStatus IS NULL arm and excludes DONE', async () => {
  for (const target of COMPLETION_FILTER_VIEWS) {
    const view = await unwrap<ViewDefinition>(target.path);
    const gqlFilter = computeViewGqlFilter(view);
    const arms = collectOrArms(gqlFilter);

    const includesNullArm = arms.some((arm) => {
      const statusFilter = (arm as Record<string, unknown>)[
        projectStatusFieldMetadataItem.name
      ];

      return (
        statusFilter !== null &&
        typeof statusFilter === 'object' &&
        (statusFilter as Record<string, unknown>).is === 'NULL'
      );
    });

    assert.ok(
      includesNullArm,
      `${view.name} computed filter must include a projectStatus IS NULL arm`,
    );

    const excludesDoneArm = arms.some((arm) => {
      const negated = (arm as Record<string, unknown>).not;
      const statusFilter =
        negated !== null && typeof negated === 'object'
          ? (negated as Record<string, unknown>)[
              projectStatusFieldMetadataItem.name
            ]
          : undefined;

      return (
        statusFilter !== null &&
        typeof statusFilter === 'object' &&
        JSON.stringify((statusFilter as Record<string, unknown>).in) ===
          JSON.stringify(['DONE'])
      );
    });

    assert.ok(
      excludesDoneArm,
      `${view.name} computed filter must exclude projectStatus DONE`,
    );
  }
});
test('the plain IS NOT DONE arm alone would drop NULL rows (the residual this fixes)', () => {
  // Guard rail: proves the reason the OR group exists. SQL `NOT (col IN
  // ('DONE'))` is NULL for a NULL column, so the single-filter shape excludes
  // the very rows the board surfaces.
  const plainFilter = computeRecordGqlOperationFilter({
    recordFilters: [
      {
        fieldMetadataId: TASK_FIELD_IDS.projectStatus,
        value: SELECT_FILTER_VALUE_DONE,
        operand: RecordFilterOperand.IS_NOT,
        type: 'SELECT' as const,
      },
    ],
    recordFilterGroups: [],
    fieldMetadataItems: [projectStatusFieldMetadataItem],
    filterValueDependencies: {},
  });

  assert.deepEqual(plainFilter, { not: { projectStatus: { in: ['DONE'] } } });

  const arms = collectOrArms(plainFilter as Record<string, unknown>);
  const includesNullArm = arms.some((arm) => {
    const statusFilter = (arm as Record<string, unknown>)[
      projectStatusFieldMetadataItem.name
    ];

    return (
      statusFilter !== null &&
      typeof statusFilter === 'object' &&
      (statusFilter as Record<string, unknown>).is === 'NULL'
    );
  });

  assert.equal(
    includesNullArm,
    false,
    'the ungrouped IS NOT DONE filter must not include a NULL arm',
  );
});
