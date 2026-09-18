import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewOpenRecordIn,
  ViewType,
} from 'twenty-sdk/define';

import {
  ATTACHMENT_FIELD_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

// The spike noted the native `allAttachments` view will not show the Drive
// fields, so Drive owns its own attachment view. This is the only place a
// standard-object view mixes the native `name` with the app fields.
const attachmentFields =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.fields;

const field = {
  name: attachmentFields.name.universalIdentifier,
  folder: ATTACHMENT_FIELD_IDS.folder,
  starred: ATTACHMENT_FIELD_IDS.starred,
  sourceApp: ATTACHMENT_FIELD_IDS.sourceApp,
  description: ATTACHMENT_FIELD_IDS.description,
};

const fieldId = (position: number) => viewFieldId('02', position);

export default defineView({
  universalIdentifier: VIEW_IDS.allDriveFiles,
  name: 'Tous les fichiers',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconFiles',
  position: 1,
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
      fieldMetadataUniversalIdentifier: field.folder,
      position: 1,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: field.sourceApp,
      position: 2,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: field.starred,
      position: 3,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: fieldId(4),
      fieldMetadataUniversalIdentifier: field.description,
      position: 4,
      isVisible: true,
      size: 280,
    },
  ],
});
