import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  EXTERNAL_OBJECT_IDS,
  MORPH_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Incoming/target morph leg: the picked record. Shares MORPH_IDS.target with
// the task leg; distinct from the source group so an object can link to itself.
export default defineField({
  universalIdentifier: RELATION_IDS.targetDocument,
  objectUniversalIdentifier: OBJECT_IDS.a2eLink,
  type: FieldType.MORPH_RELATION,
  name: 'targetDocument',
  label: 'Document cible',
  description: 'Document pointé par le lien.',
  icon: 'IconNotes',
  isNullable: true,
  morphId: MORPH_IDS.target,
  relationTargetObjectMetadataUniversalIdentifier: EXTERNAL_OBJECT_IDS.document,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.documentIncomingLinks,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'targetDocumentId',
  },
  isUIEditable: false,
});
