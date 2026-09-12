import {
  defineView,
  ViewOpenRecordIn,
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

// Native kanban grouped by the task status select (drag = status update),
// the "Board view" bullet.
const fieldId = (position: number) => viewFieldId('01', 1, position);

export default defineView({
  universalIdentifier: VIEW_IDS.taskBoard,
  name: 'Board tâches',
  objectUniversalIdentifier:
    '20202020-1ba1-48ba-bc83-ef7e5990ed10',
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 1,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  mainGroupByFieldMetadataUniversalIdentifier: taskField.status,
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
      fieldMetadataUniversalIdentifier: taskField.dueAt,
      position: 1,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: taskField.assignee,
      position: 2,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: taskProjectField,
      position: 3,
      isVisible: true,
      size: 180,
    },
  ],
  groups: [
    {
      universalIdentifier: 'c31a0100-0007-4000-8000-000000000001',
      // Task status options: TODO / IN_PROGRESS / DONE.
      fieldValue: 'TODO',
      isVisible: true,
      position: 0,
    },
    {
      universalIdentifier: 'c31a0100-0007-4000-8000-000000000002',
      fieldValue: 'IN_PROGRESS',
      isVisible: true,
      position: 1,
    },
    {
      universalIdentifier: 'c31a0100-0007-4000-8000-000000000003',
      fieldValue: 'DONE',
      isVisible: true,
      position: 2,
    },
  ],
});
