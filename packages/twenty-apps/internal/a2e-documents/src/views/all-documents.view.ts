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

const field = {
  title: 'c31a0100-0001-4000-8000-000000000001',
  kind: 'c31a0100-0001-4000-8000-000000000003',
  tags: 'c31a0100-0001-4000-8000-000000000008',
  archivedAt: 'c31a0100-0001-4000-8000-000000000009',
};

const id = (viewIndex: number) => (position: number) =>
  viewFieldId(viewIndex, position);

const fieldId = id(0);

export default defineView({
  universalIdentifier: VIEW_IDS.allDocuments,
  name: 'Tous les documents',
  objectUniversalIdentifier: OBJECT_IDS.document,
  type: ViewType.TABLE,
  icon: 'IconNotes',
  position: 0,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  fields: [
    {
      universalIdentifier: fieldId(0),
      fieldMetadataUniversalIdentifier: field.title,
      position: 0,
      isVisible: true,
      size: 280,
    },
    {
      universalIdentifier: fieldId(1),
      fieldMetadataUniversalIdentifier: field.kind,
      position: 1,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: field.tags,
      position: 2,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: field.archivedAt,
      position: 3,
      isVisible: true,
      size: 160,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31a0100-0006-4000-8000-000000000001',
      fieldMetadataUniversalIdentifier: field.title,
      direction: ViewSortDirection.ASC,
    },
  ],
});
