import {
  defineView,
  ViewOpenRecordIn,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  FOLDER_FIELD_IDS,
  OBJECT_IDS,
  RELATION_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

// Field metadata ids from src/objects/drive-folder.object.ts, kept here as
// view data (views reference fields by universal identifier only).
const field = {
  name: FOLDER_FIELD_IDS.name,
  icon: FOLDER_FIELD_IDS.icon,
  color: FOLDER_FIELD_IDS.color,
  parent: RELATION_IDS.folderParent,
};

const fieldId = (position: number) => viewFieldId('01', position);

export default defineView({
  universalIdentifier: VIEW_IDS.allDriveFolders,
  name: 'Tous les dossiers',
  objectUniversalIdentifier: OBJECT_IDS.driveFolder,
  type: ViewType.TABLE,
  icon: 'IconFolder',
  position: 0,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  fields: [
    {
      universalIdentifier: fieldId(0),
      fieldMetadataUniversalIdentifier: field.name,
      position: 0,
      isVisible: true,
      size: 280,
    },
    {
      universalIdentifier: fieldId(1),
      fieldMetadataUniversalIdentifier: field.parent,
      position: 1,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: field.color,
      position: 2,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: field.icon,
      position: 3,
      isVisible: true,
      size: 120,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31d0100-0006-4000-8000-000000000001',
      fieldMetadataUniversalIdentifier: field.name,
      direction: ViewSortDirection.ASC,
    },
  ],
});
