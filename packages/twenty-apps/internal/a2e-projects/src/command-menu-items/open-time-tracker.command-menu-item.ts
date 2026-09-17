import {
  defineCommandMenuItem,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../constants/universal-identifiers.ts';

// Record-scoped Cmd+K action on a task: opens the running-timer surface for
// the selected task. Task-scoped (not GLOBAL) because a stop has to land on
// one task, and the panel mounts next to the presence surfaces rather than
// owning a presence system.
export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.openTimeTracker,
  label: 'A2E Projects : chronomètre',
  shortLabel: 'Chronomètre',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.timeTracker,
});
