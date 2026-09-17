import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../constants/universal-identifiers.ts';

// Cmd+K action: creates a task with the typed title and opens its record
// page. GLOBAL (the "Create <thing>" anatomy rule): a new task needs no
// selected record, unlike the task-scoped timer/subtask commands.
export default defineCommandMenuItem({
  universalIdentifier: COMMAND_MENU_ITEM_IDS.createTask,
  label: 'A2E Projects : créer une tâche',
  shortLabel: 'Créer une tâche',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.createTaskCommand,
});
