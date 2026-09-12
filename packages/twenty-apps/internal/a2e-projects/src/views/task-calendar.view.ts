import {
  defineView,
  ViewFilterOperand,
  ViewCalendarLayout,
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
};

// App task ➜ project relation (task-project.field.ts).
const taskProjectField = 'c31a0201-0001-4000-8000-000000000001';

// Native calendar view on task dueAt — the "Calendar view of tasks/due
// dates" bullet, using Twenty's native calendar rendering.
const fieldId = (position: number) => viewFieldId('01', 2, position);

export default defineView({
  universalIdentifier: VIEW_IDS.taskCalendar,
  name: 'Calendrier tâches',
  objectUniversalIdentifier:
    '20202020-1ba1-48ba-bc83-ef7e5990ed10',
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
      fieldMetadataUniversalIdentifier: taskField.status,
      position: 1,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: taskProjectField,
      position: 2,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: 'c31a0100-0005-4000-8000-000000000003',
      fieldMetadataUniversalIdentifier: taskField.status,
      operand: ViewFilterOperand.IS_NOT,
      value: 'DONE',
    },
  ],
});
