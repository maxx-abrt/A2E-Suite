import { DEFAULT_NUMBER_OF_GROUPS_LIMIT } from 'twenty-shared/constants';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// The server refuses a Common API GroupBy query whose complexity exceeds this
// cap (`COMMON_QUERY_COMPLEXITY_LIMIT` in twenty-server config-variables) with
// a `TOO_COMPLEX_QUERY` error. The task-calendar view's `GroupByTasks` query
// must stay under it. See common-group-by-query-runner.service.ts:
//   complexity = 1 + (1 + relationFieldsCount) * getGroupLimit(limit)
// and common-base-query-runner.service.ts for the relation-field count.
export const GROUP_BY_QUERY_COMPLEXITY_LIMIT = 2000;

// Live-observed complexity for `task-calendar.view.ts` before the compute-side
// repair (phase-04-report, 2026-09-24: "Query complexity: 2001. Maximum
// complexity: 2000"). The view then selected the `project` relation column;
// the repair dropped it. Calibrating the server formula to the observed value
// fixes the pre-repair relation-field count at 39, one of which was that
// column, so the repaired view computes `1 + (1 + 38) * 50 = 1951`.
export const OBSERVED_DEFECT_COMPLEXITY = 2001;

// Relation columns the compute-side repair removed from the view.
const PROJECT_RELATION_COLUMNS_REMOVED = 1;

const observedDefectRelationFieldCount =
  (OBSERVED_DEFECT_COMPLEXITY - 1) / DEFAULT_NUMBER_OF_GROUPS_LIMIT - 1;

// Relation fields the front still selects around the view's own columns (the
// standard task relations and the junction-leg expansions it always fetches).
// Constant while the view declares no relation column of its own.
export const NON_VIEW_RELATION_FIELD_COUNT =
  observedDefectRelationFieldCount - PROJECT_RELATION_COLUMNS_REMOVED;

// Relation-typed fields a calendar view can select on the standard task
// object. Only the app `project` edge is a relation the view may name; title,
// dueAt (the group-by target) and projectStatus are scalars.
const TASK_RELATION_FIELD_IDS: ReadonlySet<string> = new Set([
  TASK_FIELD_IDS.project,
]);

export type TaskCalendarViewFieldDefinition = {
  fieldMetadataUniversalIdentifier?: string;
};

export type TaskCalendarViewDefinition = {
  fields?: TaskCalendarViewFieldDefinition[];
  calendarFieldMetadataUniversalIdentifier?: string;
};

export const isTaskRelationField = (universalIdentifier: string): boolean =>
  TASK_RELATION_FIELD_IDS.has(universalIdentifier);

export const countTaskCalendarRelationFields = (
  view: TaskCalendarViewDefinition,
): number =>
  (view.fields ?? []).filter(
    (viewField) =>
      viewField.fieldMetadataUniversalIdentifier !== undefined &&
      isTaskRelationField(viewField.fieldMetadataUniversalIdentifier),
  ).length;

export const computeGroupByQueryComplexity = ({
  relationFieldCount,
  groupLimit = DEFAULT_NUMBER_OF_GROUPS_LIMIT,
}: {
  relationFieldCount: number;
  groupLimit?: number;
}): number => 1 + (1 + relationFieldCount) * groupLimit;

// Complexity of the `GroupByTasks` query the front builds for this view: the
// relation fields it selects around the view plus the view's own relation
// columns (none after the P4.2 repair).
export const computeTaskCalendarGroupByComplexity = (
  view: TaskCalendarViewDefinition,
  groupLimit?: number,
): number =>
  computeGroupByQueryComplexity({
    relationFieldCount:
      NON_VIEW_RELATION_FIELD_COUNT + countTaskCalendarRelationFields(view),
    groupLimit,
  });
