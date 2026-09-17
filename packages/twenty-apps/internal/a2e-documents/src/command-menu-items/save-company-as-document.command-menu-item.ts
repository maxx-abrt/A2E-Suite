import {
  defineCommandMenuItem,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  targetObjectReadPermissions,
} from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';

// Record-scoped Cmd+K action on a company: copies its notes' real bodies into a
// new document linked back through the document.company relation. Gated on the
// caller's read rights because the note body is the payload — a role that can
// read the company but not its notes must not see the action.
export default defineCommandMenuItem({
  universalIdentifier: 'c31a0000-0011-4000-8000-000000000004',
  label: 'A2E Documents : enregistrer comme document',
  shortLabel: 'Enregistrer comme document',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  frontComponentUniversalIdentifier:
    FRONT_COMPONENT_IDS.saveCompanyAsDocumentCommand,
  conditionalAvailabilityExpression:
    targetObjectReadPermissions.company &&
    targetObjectReadPermissions.note &&
    targetObjectReadPermissions.document,
});
