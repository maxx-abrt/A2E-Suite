import {
  defineObject,
  FieldType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { manyToOne, oneToMany } from '../constants/field-vocabulary.ts';
import {
  ATTACHMENT_FIELD_IDS,
  FOLDER_FIELD_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Drive's only workspace object, per the P6.1 folder-modeling spike. Folder
// membership of a file is an additive MANY_TO_ONE on the standard
// `attachment` (see fields/attachment-folder.field.ts), never a new morph
// target, so a file keeps its native record target and can sit in a folder at
// the same time. `parent` mirrors the document tree; sibling order uses the
// system `position` field. A folder is an organizational label, never an
// access boundary (C5).
export default defineObject({
  universalIdentifier: OBJECT_IDS.driveFolder,
  nameSingular: 'driveFolder',
  namePlural: 'driveFolders',
  labelSingular: 'Dossier',
  labelPlural: 'Dossiers',
  description:
    'Dossier de l’espace de travail : arborescence, icône, couleur et fichiers.',
  icon: 'IconFolder',
  labelIdentifierFieldMetadataUniversalIdentifier: FOLDER_FIELD_IDS.name,
  fields: [
    {
      universalIdentifier: FOLDER_FIELD_IDS.name,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nom',
      icon: 'IconFolder',
      defaultValue: "''",
    },
    {
      universalIdentifier: FOLDER_FIELD_IDS.icon,
      type: FieldType.TEXT,
      name: 'icon',
      label: 'Icône',
      description: 'Nom d’icône twenty-ui affiché dans l’arborescence',
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier: FOLDER_FIELD_IDS.color,
      type: FieldType.TEXT,
      name: 'color',
      label: 'Couleur',
      description: 'Couleur d’accent du dossier',
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier: FOLDER_FIELD_IDS.archivedAt,
      type: FieldType.DATE_TIME,
      name: 'archivedAt',
      label: 'Archivé le',
      description: 'Présent = dans la corbeille (restauration 7 jours)',
      icon: 'IconArchive',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.folderParent,
      type: FieldType.RELATION,
      name: 'parent',
      label: 'Dossier parent',
      description: 'Dossier qui contient celui-ci (vide = racine)',
      icon: 'IconFolder',
      isNullable: true,
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.driveFolder,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.folderChildren,
      universalSettings: {
        ...manyToOne('parentFolderId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.folderChildren,
      type: FieldType.RELATION,
      name: 'children',
      label: 'Sous-dossiers',
      icon: 'IconHierarchy',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.driveFolder,
      relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.folderParent,
      universalSettings: oneToMany,
    },
    {
      universalIdentifier: ATTACHMENT_FIELD_IDS.driveFolderFiles,
      type: FieldType.RELATION,
      name: 'files',
      label: 'Fichiers',
      description: 'Pièces jointes rangées dans ce dossier',
      icon: 'IconFiles',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        ATTACHMENT_FIELD_IDS.folder,
      universalSettings: oneToMany,
    },
  ],
});
