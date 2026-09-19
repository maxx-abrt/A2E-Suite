import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  EXTERNAL_OBJECT_UNIVERSAL_IDENTIFIERS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// document ➜ project: the FK lives on A2E Documents' `document` object, which
// this app does not own — hence a standalone app-owned field manifest
// (company-projects.field.ts pattern). A2E Documents installs before A2E
// Projects so the target object exists when this relation resolves. Deleting
// a project orphans its documents on purpose (SET_NULL), matching task.project.
export default defineField({
  universalIdentifier: RELATION_IDS.documentProject,
  objectUniversalIdentifier: EXTERNAL_OBJECT_UNIVERSAL_IDENTIFIERS.document,
  type: FieldType.RELATION,
  name: 'project',
  label: 'Projet',
  description: 'Projet auquel ce document appartient',
  icon: 'IconKanban',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.project,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.projectDocuments,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName: 'projectId',
    onDelete: OnDeleteAction.SET_NULL,
  },
});
