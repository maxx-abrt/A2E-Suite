import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { OBJECT_IDS, RELATION_IDS } from '../constants/universal-identifiers.ts';

// Inverse side of invoice.client: lives on the standard company object,
// which this app does not own — hence a standalone app-owned field manifest.
export default defineField({
  universalIdentifier: RELATION_IDS.companyInvoices,
  name: 'invoices',
  label: 'Factures',
  type: FieldType.RELATION,
  objectUniversalIdentifier: '20202020-b374-4779-a561-80086cb2e17f',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.invoice,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.invoiceClient,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
