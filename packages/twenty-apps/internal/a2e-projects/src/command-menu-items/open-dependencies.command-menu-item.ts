import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../constants/universal-identifiers.ts';

// Opens the dependency picker. GLOBAL like the subtask widget: it scopes to
// the selected task when there is exactly one, and otherwise asks for a
// single selection before offering the blocker choices.
export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.openDependencies,
  label: 'A2E Projects : dépendances',
  shortLabel: 'Dépendances',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.taskDependencies,
});
