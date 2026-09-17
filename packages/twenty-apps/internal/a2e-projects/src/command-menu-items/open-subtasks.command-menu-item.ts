import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../constants/universal-identifiers.ts';

// Opens the nested subtask list. GLOBAL (like a2e-documents' document browser)
// rather than RECORD_SELECTION: the widget scopes itself to the selected task
// when there is exactly one, and otherwise browses the whole forest.
export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.openSubtasks,
  label: 'A2E Projects : sous-tâches',
  shortLabel: 'Sous-tâches',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.taskSubtasks,
});
