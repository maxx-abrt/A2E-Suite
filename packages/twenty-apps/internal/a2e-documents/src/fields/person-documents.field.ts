import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { OBJECT_IDS, RELATION_IDS } from '../constants/universal-identifiers.ts';

// Inverse side of document.person: lives on the standard person object,
// which this app does not own — hence a standalone app-owned field manifest.
export default defineField({
  universalIdentifier: RELATION_IDS.personDocuments,
  name: 'documents',
  label: 'Documents',
  type: FieldType.RELATION,
  objectUniversalIdentifier: '20202020-e674-48e5-a542-72570eee7213',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.document,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.documentPerson,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
