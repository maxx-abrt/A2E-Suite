import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { OBJECT_IDS, RELATION_IDS } from '../constants/universal-identifiers.ts';

// Inverse side of quote.client: lives on the standard company object,
// which this app does not own — hence a standalone app-owned field manifest.
export default defineField({
  universalIdentifier: RELATION_IDS.companyQuotes,
  name: 'quotes',
  label: 'Devis',
  type: FieldType.RELATION,
  objectUniversalIdentifier: '20202020-b374-4779-a561-80086cb2e17f',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.quote,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.quoteClient,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
