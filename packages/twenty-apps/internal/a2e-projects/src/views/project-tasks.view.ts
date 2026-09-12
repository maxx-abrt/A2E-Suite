import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewOpenRecordIn,
  ViewType,
} from 'twenty-sdk/define';

import { TASK_FIELD_IDS, viewFieldId } from '../constants/universal-identifiers.ts';

// The only free entry point owed to law §3 on the standard task surface.
// SYSTEM_VIEW_KEYS / GET_VIEW_UNIVERSAL_IDENTIFIER only cover the standard
// app's own INDEX/FIELDS_WIDGET views, so app views on standard objects use
// the object's universal identifier directly (same primitive a view on an
// app object would reference).
export default defineView({
  universalIdentifier: 'c31a0201-0003-4000-8000-000000000001',
  name: 'Tâches projet',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconKanban' as never,
  position: 1,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  fields: [
    {
      universalIdentifier: viewFieldId(1, 0),
      fieldMetadataUniversalIdentifier: '20202020-b386-4cb7-aa5a-08d4a4d92680',
      position: 0,
      isVisible: true,
      size: 280,
    },
    {
      universalIdentifier: viewFieldId(1, 1),
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.project,
      position: 1,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: viewFieldId(1, 2),
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.projectStatus,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: viewFieldId(1, 3),
      fieldMetadataUniversalIdentifier: '20202020-065a-4f42-a906-e20422c1753f',
      position: 3,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: viewFieldId(1, 4),
      fieldMetadataUniversalIdentifier: TASK_FIELD_IDS.priority,
      position: 4,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: viewFieldId(1, 5),
      fieldMetadataUniversalIdentifier: '20202020-fd99-40da-951b-4cb9a352fce3',
      position: 5,
      isVisible: true,
      size: 160,
    },
  ],
});
