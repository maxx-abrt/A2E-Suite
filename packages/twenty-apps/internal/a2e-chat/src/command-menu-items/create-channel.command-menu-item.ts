import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../constants/universal-identifiers.ts';

// Cmd+K action: creates a workspace channel with the typed name and opens its
// record page.
export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.createChannel,
  label: 'A2E Chat : créer un canal',
  shortLabel: 'Créer un canal',
  availabilityType: 'GLOBAL',
  isPinned: true,
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.createChannelCommand,
});
