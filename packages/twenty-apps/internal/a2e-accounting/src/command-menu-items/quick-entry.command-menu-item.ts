import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../constants/universal-identifiers.ts';

export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.quickEntry,
  label: 'Bilan : saisie rapide',
  shortLabel: 'Saisie rapide',
  availabilityType: 'GLOBAL',
  isPinned: true,
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.quickEntry,
});
