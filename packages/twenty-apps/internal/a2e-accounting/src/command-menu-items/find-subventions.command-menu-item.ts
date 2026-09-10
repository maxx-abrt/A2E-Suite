import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../constants/universal-identifiers.ts';

export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.findSubventions,
  label: 'Bilan : trouver des aides',
  shortLabel: 'Trouver des aides',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.subventionExplorer,
});
