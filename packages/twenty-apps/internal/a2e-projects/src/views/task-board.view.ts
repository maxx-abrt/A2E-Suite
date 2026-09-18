import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewOpenRecordIn,
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
  dueAt: '20202020-fd99-40da-951b-4cb9a352fce3',
  assignee: '20202020-065a-4f42-a906-e20422c1753f',
};

// Kanban grouped by the app task `projectStatus` select (TODO /
// IN_PROGRESS / DONE), so dragging a card across columns writes the
// project pipeline status, not Twenty's built-in task status. The board is
// project-scoped through the app task ➜ project relation filter below.
const fieldId = (position: number) => viewFieldId('01', 1, position);

export default defineView({
  universalIdentifier: VIEW_IDS.taskBoard,
  name: 'Board tâches',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 1,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  mainGroupByFieldMetadataUniversalIdentifier: TASK_FIELD_IDS.projectStatus,
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
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.project,
      position: 3,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: 'c31b0100-0005-4000-8000-000000000004',
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.project,
      operand: ViewFilterOperand.IS_NOT_EMPTY,
      value: '',
    },
  ],
  groups: [
    {
      universalIdentifier: 'c31b0100-0007-4000-8000-000000000001',
      // taskProjectStatus option values: TODO / IN_PROGRESS / DONE.
      fieldValue: 'TODO',
      isVisible: true,
      position: 0,
    },
    {
      universalIdentifier: 'c31b0100-0007-4000-8000-000000000002',
      fieldValue: 'IN_PROGRESS',
      isVisible: true,
      position: 1,
    },
    {
      universalIdentifier: 'c31b0100-0007-4000-8000-000000000003',
      fieldValue: 'DONE',
      isVisible: true,
      position: 2,
    },
  ],
});
