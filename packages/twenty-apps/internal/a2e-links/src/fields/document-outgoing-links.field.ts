import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  EXTERNAL_OBJECT_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Inverse of the outgoing document morph group. Lives on A2E Documents' own
// `document` object, so it is a standalone app-owned field manifest
// (consumer-owns-both-sides, D-P4.3-DOC).
export default defineField({
  universalIdentifier: RELATION_IDS.documentOutgoingLinks,
  objectUniversalIdentifier: EXTERNAL_OBJECT_IDS.document,
  type: FieldType.RELATION,
  name: 'outgoingLinks',
  label: 'Liens sortants',
  description: 'Liens dont ce document est la source.',
  icon: 'IconArrowRight',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.a2eLink,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.sourceDocument,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
  isUIEditable: false,
});
