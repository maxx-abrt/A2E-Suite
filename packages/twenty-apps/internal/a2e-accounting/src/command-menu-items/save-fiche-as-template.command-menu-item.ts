import {
  defineCommandMenuItem,
  targetObjectReadPermissions,
} from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// M9b 'Save as template' record action (US-137): scoped to a fiche selection,
// so it only appears on a Bilan fiche record surface. Gated on the caller's
// fiche read right — the fiche layout is the payload.
export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.saveFicheAsTemplate,
  label: 'Bilan : enregistrer comme modèle',
  shortLabel: 'Enregistrer comme modèle',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: OBJECT_IDS.fiche,
  frontComponentUniversalIdentifier:
    FRONT_COMPONENT_IDS.saveFicheAsTemplateCommand,
  conditionalAvailabilityExpression: targetObjectReadPermissions.fiche,
});
