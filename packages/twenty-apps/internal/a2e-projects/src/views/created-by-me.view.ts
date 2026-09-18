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

// createdBy is a derived system ACTOR field, so its universal identifier is
// read from the SDK rather than hardcoded (twenty-shared derives it).
const createdByField =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.fields.createdBy
    .universalIdentifier;

// "My tasks" smart list 2/3 — created by me. ACTOR fields filter on the
// workspaceMemberId sub-field with the same current-workspace-member
// placeholder the assignee filter uses.
const fieldId = (position: number) => viewFieldId('01', 5, position);

export default defineView({
  universalIdentifier: VIEW_IDS.taskCreatedByMe,
  name: 'Créées par moi',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconUserPlus',
  position: 4,
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
      universalIdentifier: 'c31b0100-0005-4000-8000-000000000006',
      fieldMetadataUniversalIdentifier: createdByField,
      subFieldName: 'workspaceMemberId',
      operand: ViewFilterOperand.IS,
      value: JSON.stringify({
        isCurrentWorkspaceMemberSelected: true,
        selectedRecordIds: [],
      }),
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31b0100-0006-4000-8000-000000000003',
      fieldMetadataUniversalIdentifier: taskField.dueAt,
      direction: ViewSortDirection.ASC,
    },
  ],
});
