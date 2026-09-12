import {
  type DatabaseEventPayload,
  defineLogicFunction,
} from 'twenty-sdk/define';

import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  LOGIC_FUNCTION_IDS,
} from '../constants/universal-identifiers.ts';

// Human id contract: each project owns a monotonically increasing task
// counter; a task joining a project takes the next slot and keeps its
// identifier for life ("<KEY>-<n>"), so the number never shifts when
// earlier tasks are deleted — that invariant is why the count is stored on
// the project record instead of being derived from existing rows.

type TaskRecord = {
  id: string;
  humanId?: string | null;
  project?: { id: string; key?: string | null } | null;
};

const isCreateEvent = (eventName: string): boolean =>
  eventName.endsWith('.created');

const isUpdateEvent = (eventName: string): boolean =>
  eventName.endsWith('.updated');

// The project key is already printed on the record (e.g. "PRJ"); the join
// counter lives on the project row (see fields/project-task-counter).
const computeHumanId = (projectKey: string, counter: number): string =>
  `${projectKey}-${counter}`;

type ProjectRecord = {
  id: string;
  key?: string | null;
  taskCounter?: number | null;
};

const loadProject = async (
  projectId: string,
): Promise<ProjectRecord | undefined> => {
  const client = new CoreApiClient();

  const result = (await (client as never as {
    query: (shape: never) => Promise<unknown>;
  }).query({
    projects: {
      __args: { filter: { id: { eq: projectId } }, first: 1 },
      edges: {
        node: { id: true, key: true, taskCounter: true },
      },
    },
  } as never)) as { projects?: { edges?: { node: ProjectRecord }[] } };

  return result.projects?.edges?.[0]?.node;
};

const updateTaskHumanId = async (
  client: CoreApiClient,
  taskId: string,
  humanId: string,
): Promise<void> => {
  await (client as never as {
    mutation: (shape: never) => Promise<unknown>;
  }).mutation({
    updateTask: {
      __args: { id: taskId, data: { humanId } },
      id: true,
    },
  } as never);
};

const updateProjectCounter = async (
  client: CoreApiClient,
  projectId: string,
  taskCounter: number,
): Promise<void> => {
  await (client as never as {
    mutation: (shape: never) => Promise<unknown>;
  }).mutation({
    updateProject: {
      __args: { id: projectId, data: { taskCounter } },
      id: true,
    },
  } as never);
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.taskHumanId,
  name: 'task-human-id',
  description:
    "Attribue à chaque tâche projet un identifiant humain stable « CLÉ-n » (compteur persisté sur le projet, jamais recalculé).",
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'task.*',
  },
  handler: async (
    payload: DatabaseEventPayload<{
      recordId: string;
      properties: { after?: TaskRecord; before?: TaskRecord };
    }>,
  ): Promise<{ skipped?: string; humanId?: string }> => {
    const eventName = payload.name ?? '';
    const record = payload.properties?.after;

    if (!isCreateEvent(eventName) && !isUpdateEvent(eventName)) {
      return { skipped: 'not-relevant-event' };
    }

    if (!record) {
      return { skipped: 'no-record' };
    }

    // Idempotent join: a task already numbered keeps its identifier even if
    // the project FK changes; the project counter advances once, at creation.
    const projectId = record.project?.id;
    const hasHumanId = record.humanId != null && record.humanId.length > 0;

    if (projectId == null || !hasHumanId) {
      // If the task keeps no project, no human id applies.
      if (projectId == null) {
        return { skipped: 'no-project' };
      }

      // First number for this task (or FK join) — one call into the counter.
      const project = await loadProject(projectId);
      if (project == null || project.key == null) {
        return { skipped: 'project-missing-key' };
      }

      const nextCounter = (project.taskCounter ?? 0) + 1;
      const humanId = computeHumanId(project.key, nextCounter);

      const client = new CoreApiClient();
      await updateTaskHumanId(client, record.id, humanId);
      await updateProjectCounter(client, projectId, nextCounter);

      return { humanId };
    }

    return { skipped: 'already-numbered' };
  },
});
