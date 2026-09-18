import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../constants/universal-identifiers.ts';

export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.goToChat,
  label: 'A2E Chat : aller aux discussions',
  shortLabel: 'Discussions',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.goToChat,
});
