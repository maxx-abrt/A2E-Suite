import {
  type DatabaseEventPayload,
  defineLogicFunction,
} from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { assignTaskHumanId } from './handlers/task-human-id-handler.ts';

// Human id contract: each project owns a monotonically increasing task
// counter; a task joining a project takes the next slot and keeps its
// identifier for life ("<KEY>-<n>"), so the number never shifts when
// earlier tasks are deleted — that invariant is why the count is stored on
// the project record instead of being derived from existing rows.
//
// The handler owns the idempotence and the atomic CAS allocation; this file
// only unwraps the event payload.

type TaskRecord = {
  id: string;
  humanId?: string | null;
  project?: { id: string; key?: string | null } | null;
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.taskHumanId,
  name: 'task-human-id',
  description:
    'Attribue à chaque tâche projet un identifiant humain stable « CLÉ-n » (compteur persisté sur le projet, alloué par CAS pour rester unique sous concurrence).',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'task.*',
  },
  handler: async (
    payload: DatabaseEventPayload<{
      recordId: string;
      properties: { after?: TaskRecord; before?: TaskRecord };
    }>,
  ): Promise<{ skipped?: string; humanId?: string }> =>
    assignTaskHumanId(payload.properties?.after, payload.name ?? ''),
});
