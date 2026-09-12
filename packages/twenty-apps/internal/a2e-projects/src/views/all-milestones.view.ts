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

// Field metadata ids from src/objects/milestone.object.ts.
const field = {
  name: 'c31a0300-0001-4000-8000-000000000001',
  dueAt: 'c31a0300-0001-4000-8000-000000000002',
  doneAt: 'c31a0300-0001-4000-8000-000000000003',
  project: 'c31a0300-0002-4000-8000-000000000001',
};

const fieldId = (position: number) => viewFieldId('03', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.allMilestones,
  name: 'Tous les jalons',
  objectUniversalIdentifier: OBJECT_IDS.milestone,
  type: ViewType.TABLE,
  icon: 'IconTarget',
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
      fieldMetadataUniversalIdentifier: field.dueAt,
      position: 1,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: field.doneAt,
      position: 2,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: field.project,
      position: 3,
      isVisible: true,
      size: 180,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31a0300-0006-4000-8000-000000000001',
      fieldMetadataUniversalIdentifier: field.dueAt,
      direction: ViewSortDirection.ASC,
    },
  ],
});
