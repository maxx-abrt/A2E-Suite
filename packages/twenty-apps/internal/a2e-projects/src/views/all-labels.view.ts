import {
  defineView,
  ViewOpenRecordIn,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

// Field metadata ids from src/objects/label.object.ts.
const field = {
  name: 'c31a0600-0001-4000-8000-000000000001',
  color: 'c31a0600-0001-4000-8000-000000000002',
};

const fieldId = (position: number) => viewFieldId('06', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.allLabels,
  name: 'Toutes les étiquettes',
  objectUniversalIdentifier: OBJECT_IDS.label,
  type: ViewType.TABLE,
  icon: 'IconTag',
  position: 0,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  fields: [
    {
      universalIdentifier: fieldId(0),
      fieldMetadataUniversalIdentifier: field.name,
      position: 0,
      isVisible: true,
      size: 240,
    },
    {
      universalIdentifier: fieldId(1),
      fieldMetadataUniversalIdentifier: field.color,
      position: 1,
      isVisible: true,
      size: 140,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31a0600-0006-4000-8000-000000000001',
      fieldMetadataUniversalIdentifier: field.name,
      direction: ViewSortDirection.ASC,
    },
  ],
});
