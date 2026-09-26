import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewCalendarLayout,
  ViewFilterGroupLogicalOperator,
  ViewFilterOperand,
  ViewOpenRecordIn,
  ViewType,
} from 'twenty-sdk/define';

import {
  SELECT_FILTER_VALUE_DONE,
  TASK_FIELD_IDS,
  VIEW_FILTER_GROUP_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

// Native standard task field uuids (twenty-shared STANDARD_OBJECT_FIELDS).
const taskField = {
  title: '20202020-b386-4cb7-aa5a-08d4a4d92680',
  dueAt: '20202020-fd99-40da-951b-4cb9a352fce3',
};

// Native calendar view on task dueAt — the "Calendar view of tasks/due
// dates" bullet, using Twenty's native CALENDAR rendering on the standard
// task object. The app task ➜ project relation scopes it to project work,
// matching the board. This only displays due dates: no provider event is
// created and no invitation is sent (P4C.5 owns synchronization).
const fieldId = (position: number) => viewFieldId('01', 2, position);

export default defineView({
  universalIdentifier: VIEW_IDS.taskCalendar,
  name: 'Calendrier tâches',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: ViewType.CALENDAR,
  icon: 'IconCalendar',
  position: 2,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  calendarLayout: ViewCalendarLayout.MONTH,
  calendarFieldMetadataUniversalIdentifier: taskField.dueAt,
  fields: [
    {
      universalIdentifier: fieldId(0),
      fieldMetadataUniversalIdentifier: taskField.title,
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: fieldId(1),
      // Pipeline status column, matching the board's group-by field — not the
      // native task `status` (the two diverge once the app writes the
      // pipeline; see the completion filter note below).
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.projectStatus,
      position: 1,
      isVisible: true,
      size: 150,
    },
    // The project relation column is intentionally omitted: including it
    // raises the GroupByTasks query complexity above the 2000 cap (live
    // defect 2b, 2026-09-24). The IS_NOT_EMPTY filter already scopes
    // the calendar to project-backed tasks; the column is redundant.
  ],
  filters: [
    {
      universalIdentifier: 'c31b0100-0005-4000-8000-000000000003',
      // Completion exclusion reads the app pipeline `projectStatus` — the
      // same field the board groups on — so a task marked DONE on the board
      // leaves the calendar too. Filtering the native task `status` would
      // keep app-created tasks on the calendar forever, since their native
      // status keeps its TODO default when the pipeline moves to DONE.
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.projectStatus,
      operand: ViewFilterOperand.IS_NOT,
      value: SELECT_FILTER_VALUE_DONE,
      // Attached to the OR completion group below: `IS_NOT 'DONE'` alone is
      // SQL `NOT (projectStatus IN ('DONE'))`, which is NULL for a row with no
      // pipeline status and would hide it while the board shows it ungrouped.
      viewFilterGroupUniversalIdentifier:
        VIEW_FILTER_GROUP_IDS.taskCalendarCompletion,
      positionInViewFilterGroup: 0,
    },
    {
      universalIdentifier: 'c31b0100-0005-4000-8000-00000000000a',
      // NULL pipeline status is "not done" too — the default TODO the field
      // declaration carries covers app-created rows, this covers the rest.
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.projectStatus,
      operand: ViewFilterOperand.IS_EMPTY,
      value: '',
      viewFilterGroupUniversalIdentifier:
        VIEW_FILTER_GROUP_IDS.taskCalendarCompletion,
      positionInViewFilterGroup: 1,
    },
    {
      universalIdentifier: 'c31b0100-0005-4000-8000-000000000005',
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.project,
      operand: ViewFilterOperand.IS_NOT_EMPTY,
      value: '',
    },
  ],
  filterGroups: [
    {
      universalIdentifier: VIEW_FILTER_GROUP_IDS.taskCalendarCompletion,
      // (projectStatus IS EMPTY) OR (projectStatus IS NOT 'DONE'): includes
      // NULL rows, still excludes DONE.
      logicalOperator: ViewFilterGroupLogicalOperator.OR,
    },
  ],
});
