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

// Field metadata ids from src/objects/project.object.ts, kept here as view
// data (views reference fields by universal identifier only).
const field = {
  name: 'c31a0200-0001-4000-8000-000000000001',
  status: 'c31a0200-0001-4000-8000-000000000003',
  health: 'c31a0200-0001-4000-8000-000000000004',
  lead: 'c31a0200-0002-4000-8000-000000000001',
  dueAt: 'c31a0200-0001-4000-8000-000000000006',
  budget: 'c31a0200-0001-4000-8000-000000000009',
};

const fieldId = (position: number) => viewFieldId('02', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.allProjects,
  name: 'Tous les projets',
  objectUniversalIdentifier: OBJECT_IDS.project,
  type: ViewType.TABLE,
  icon: 'IconKanban',
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
      fieldMetadataUniversalIdentifier: field.status,
      position: 1,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: field.health,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: field.lead,
      position: 3,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: fieldId(4),
      fieldMetadataUniversalIdentifier: field.dueAt,
      position: 4,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: fieldId(5),
      fieldMetadataUniversalIdentifier: field.budget,
      position: 5,
      isVisible: true,
      size: 140,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31a0200-0006-4000-8000-000000000001',
      fieldMetadataUniversalIdentifier: field.name,
      direction: ViewSortDirection.ASC,
    },
  ],
});
