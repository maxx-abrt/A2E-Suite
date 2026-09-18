import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  ATTACHMENT_FIELD_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// P6.1 spike decision: folder membership is an additive MANY_TO_ONE relation
// on the standard `attachment`, not another morph target on the shared
// `targetMorphId` set. The relation field is `folder` and its join column
// `folderId`, so the workspace scalar is `folderId` (the A2E Projects
// `projectId` pattern). SET_NULL keeps every native upload when a folder is
// deleted, and `folder` is never checked for access (C5): moving a file
// between folders changes no permission.
export default defineField({
  universalIdentifier: ATTACHMENT_FIELD_IDS.folder,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.universalIdentifier,
  type: FieldType.RELATION,
  name: 'folder',
  label: 'Dossier',
  description:
    'Dossier Drive qui range ce fichier (organisation, jamais une permission)',
  icon: 'IconFolder',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.driveFolder,
  relationTargetFieldMetadataUniversalIdentifier:
    ATTACHMENT_FIELD_IDS.driveFolderFiles,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName: 'folderId',
    onDelete: OnDeleteAction.SET_NULL,
  },
});
