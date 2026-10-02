import {
  defineCommandMenuItem,
  targetObjectReadPermissions,
} from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// M9b 'Save as template' record action (US-137): scoped to a project selection,
// so it only appears on a project record surface. Gated on the caller's project
// read right — the project and its tasks are the payload.
export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.saveProjectAsTemplate,
  label: 'Bureau : créer un modèle',
  shortLabel: 'Créer un modèle',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: OBJECT_IDS.project,
  frontComponentUniversalIdentifier:
    FRONT_COMPONENT_IDS.saveProjectAsTemplateCommand,
  conditionalAvailabilityExpression:
    targetObjectReadPermissions.project,
});
