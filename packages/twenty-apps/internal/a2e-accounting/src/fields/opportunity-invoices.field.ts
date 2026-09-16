import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { OBJECT_IDS, RELATION_IDS } from '../constants/universal-identifiers.ts';

// Inverse side of invoice.opportunity: lives on the standard opportunity
// object, which this app does not own — hence a standalone app-owned field
// manifest.
export default defineField({
  universalIdentifier: RELATION_IDS.opportunityInvoices,
  name: 'invoices',
  label: 'Factures',
  type: FieldType.RELATION,
  // Canonical STANDARD_OBJECT_IDS.opportunity (twenty-shared); hardcoded like
  // a2e-documents' standalone fields — the app build cannot resolve the const.
  objectUniversalIdentifier: '20202020-9549-49dd-b2b2-883999db8938',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.invoice,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.invoiceOpportunity,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
