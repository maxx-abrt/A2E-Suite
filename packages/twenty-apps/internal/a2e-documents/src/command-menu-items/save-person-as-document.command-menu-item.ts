import {
  defineCommandMenuItem,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';

// Record-scoped Cmd+K action on a person: snapshots its name into a new
// document linked back through the document.person relation.
export default defineCommandMenuItem({
  universalIdentifier: 'c31a0000-0011-4000-8000-000000000005',
  label: 'A2E Documents : enregistrer comme document',
  shortLabel: 'Enregistrer comme document',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  frontComponentUniversalIdentifier:
    FRONT_COMPONENT_IDS.saveRecordAsDocumentCommand,
});
