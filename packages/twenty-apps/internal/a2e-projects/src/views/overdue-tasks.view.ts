import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewOpenRecordIn,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  TASK_FIELD_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

// Native standard task field uuids (twenty-shared STANDARD_OBJECT_FIELDS).
const taskField = {
  title: '20202020-b386-4cb7-aa5a-08d4a4d92680',
  status: '20202020-70bc-48f9-89c5-6aa730b151e0',
  dueAt: '20202020-fd99-40da-951b-4cb9a352fce3',
  assignee: '20202020-065a-4f42-a906-e20422c1753f',
};

// "My tasks" smart list 3/3 — overdue. A task is overdue when its dueAt is
// in the past and it is not done: the DATE_TIME IS_IN_PAST operand is
// value-less, and the status comparison keeps the select-status approach
// (no custom-status object).
const fieldId = (position: number) => viewFieldId('01', 6, position);

export default defineView({
  universalIdentifier: VIEW_IDS.taskOverdue,
  name: 'En retard',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconAlertTriangle',
  position: 5,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  fields: [
    {
      universalIdentifier: fieldId(0),
      fieldMetadataUniversalIdentifier: taskField.title,
      position: 0,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: fieldId(1),
      fieldMetadataUniversalIdentifier: taskField.status,
      position: 1,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: taskField.dueAt,
      position: 2,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: taskField.assignee,
      position: 3,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: fieldId(4),
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.project,
      position: 4,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: 'c31b0100-0005-4000-8000-000000000007',
      fieldMetadataUniversalIdentifier: taskField.dueAt,
      operand: ViewFilterOperand.IS_IN_PAST,
      value: '',
    },
    {
      universalIdentifier: 'c31b0100-0005-4000-8000-000000000008',
      fieldMetadataUniversalIdentifier: taskField.status,
      operand: ViewFilterOperand.IS_NOT,
      value: 'DONE',
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31b0100-0006-4000-8000-000000000004',
      fieldMetadataUniversalIdentifier: taskField.dueAt,
      direction: ViewSortDirection.ASC,
    },
  ],
});
