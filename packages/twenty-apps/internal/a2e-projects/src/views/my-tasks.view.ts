import {
  defineView,
  ViewFilterOperand,
  ViewOpenRecordIn,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
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

// App task ➜ project relation (task-project.field.ts).
const taskProjectField = 'c31a0201-0001-4000-8000-000000000001';

// "Tâches courantes" table filtered to open work: status ≠ DONE and
// either no assignee or assigned to me (the meFilter placeholder is
// resolved by the workspace member context at query time).
const fieldId = (position: number) => viewFieldId('01', 3, position);

export default defineView({
  universalIdentifier: VIEW_IDS.taskMyTasks,
  name: 'Mes tâches',
  objectUniversalIdentifier:
    '20202020-1ba1-48ba-bc83-ef7e5990ed10',
  type: ViewType.TABLE,
  icon: 'IconCheckbox',
  position: 2,
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
      fieldMetadataUniversalIdentifier: taskProjectField,
      position: 4,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: 'c31a0100-0005-4000-8000-000000000002',
      fieldMetadataUniversalIdentifier: taskField.assignee,
      operand: ViewFilterOperand.IS,
      // "assigned to me" uses the native current-workspace-member filter
      // value shape (compute-standard-task-view-filters util).
      value: JSON.stringify({
        isCurrentWorkspaceMemberSelected: true,
        selectedRecordIds: [],
      }),
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31a0100-0006-4000-8000-000000000001',
      fieldMetadataUniversalIdentifier: taskField.dueAt,
      direction: ViewSortDirection.ASC,
    },
  ],
});
