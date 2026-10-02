import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../constants/universal-identifiers.ts';

export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.goToChat,
  label: 'Bureau : ouvrir les discussions',
  shortLabel: 'Ouvrir les discussions',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.goToChat,
});
