import {
  defineCommandMenuItem,
  targetObjectReadPermissions,
} from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// M9b 'Save as template' record action (US-137): scoped to a document
// selection, so it only appears on a document record surface. Gated on the
// caller's document read right — the source body is the payload.
export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.saveDocumentAsTemplate,
  label: 'Bureau : enregistrer comme modèle',
  shortLabel: 'Enregistrer comme modèle',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: OBJECT_IDS.document,
  frontComponentUniversalIdentifier:
    FRONT_COMPONENT_IDS.saveDocumentAsTemplateCommand,
  conditionalAvailabilityExpression:
    targetObjectReadPermissions.document,
});
