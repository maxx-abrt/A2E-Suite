import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  EXTERNAL_OBJECT_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Inverse of the target document morph group: backlinks to this document.
export default defineField({
  universalIdentifier: RELATION_IDS.documentIncomingLinks,
  objectUniversalIdentifier: EXTERNAL_OBJECT_IDS.document,
  type: FieldType.RELATION,
  name: 'incomingLinks',
  label: 'Liens entrants',
  description: 'Liens dont ce document est la cible (backlinks).',
  icon: 'IconArrowLeft',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.a2eLink,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.targetDocument,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
  isUIEditable: false,
});
