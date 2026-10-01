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

// Outgoing morph leg: the record whose page fired "Link…", one leg per
// linkable object. Shares MORPH_IDS.source with the task leg.
export default defineField({
  universalIdentifier: RELATION_IDS.sourceDocument,
  objectUniversalIdentifier: OBJECT_IDS.a2eLink,
  type: FieldType.MORPH_RELATION,
  name: 'sourceDocument',
  label: 'Document source',
  description: 'Document à l’origine du lien.',
  icon: 'IconNotes',
  isNullable: true,
  morphId: MORPH_IDS.source,
  relationTargetObjectMetadataUniversalIdentifier: EXTERNAL_OBJECT_IDS.document,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.documentOutgoingLinks,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'sourceDocumentId',
  },
  isUIEditable: false,
});
