import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  TASK_HUMAN_ID_MAX_ATTEMPTS,
  computeTaskHumanId,
  hasTaskHumanId,
  readTaskCounter,
  readTaskProjectId,
  type TaskHumanIdTarget,
} from '../../lib/task-human-id.ts';

// L'ALLOCATEUR D'IDENTIFIANTS HUMAINS.
//
// Deux tâches créées en même temps dans le même projet ne doivent jamais
// recevoir « PRJ-1 » toutes les deux : le compteur vit sur la ligne projet,
// écrite par des chemins concurrents (création manuelle, import, workflow).
// « Lire puis écrire » allouerait deux fois le même n — et pire, l'assignation
// de humanId déclenche un nouvel événement task.updated qui rejouerait
// l'allocation si l'idempotence n'était pas vérifiée en tête de flux.
//
// La primitive de CAS du Core API : `updateProjects(filter, data)` compile en
// un seul `UPDATE … WHERE <filtre> RETURNING` (workspace-repository
// `morphAndExecute`) et ne retourne QUE les lignes réellement écrites. Faire
// porter la valeur attendue du compteur par ce filtre fait du filtre un
// compare-and-swap : un concurrent a déjà incrémenté ssi la réponse est vide.
// Les filtres NUMBER n'acceptent ni `or` ni valeur NULL dans `eq` (vérifié
// live), donc le cas compteur NULL est une seconde tentative conditionnelle
// `is: NULL` ; les deux tentatives restent chacune un UPDATE atomique.
//
// L'allocation précède l'écriture du humanId : une écriture de tâche qui
// échoue brûle un numéro (un trou est acceptable), jamais ne le réutilise.

export const TASK_HUMAN_ID_REFUSED =
  'Attribution d’identifiant contestée : le compteur du projet a changé à chaque tentative. Réessayez plus tard.';

export const coreClient = (): CoreApiClient => new CoreApiClient();

// Le client est injectable pour que node:test exerce le CAS sans Core API live.
export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

type ProjectRecord = {
  id: string;
  key?: string | null;
  taskCounter?: number | null;
};

const readProject = async (
  client: CoreClientLike,
  projectId: string,
): Promise<ProjectRecord | undefined> => {
  const result = (await client.query({
    projects: {
      __args: { filter: { id: { eq: projectId } }, first: 1 },
      edges: { node: { id: true, key: true, taskCounter: true } },
    },
  } as never)) as { projects?: { edges?: { node: ProjectRecord }[] } };

  return result?.projects?.edges?.[0]?.node;
};

type CounterFilter = { eq: number } | { is: 'NULL' };

const casBumpProjectCounter = async (
  client: CoreClientLike,
  projectId: string,
  expected: number,
  sequence: number,
): Promise<boolean> => {
  const attempt = async (taskCounter: CounterFilter): Promise<boolean> => {
    const result = (await client.mutation({
      updateProjects: {
        __args: {
          filter: { id: { eq: projectId }, taskCounter },
          data: { taskCounter: sequence },
        },
        id: true,
      },
    } as never)) as { updateProjects?: { id: string }[] };

    return (result?.updateProjects?.length ?? 0) > 0;
  };

  if (await attempt({ eq: expected })) {
    return true;
  }

  // A project created before the counter existed reads as 0 but stores NULL.
  // NUMBER filters accept `is` but no `or` (live-verified), so NULL is a
  // second conditional attempt — itself a single UPDATE ... WHERE.
  return expected === 0 && (await attempt({ is: 'NULL' }));
};

const updateTaskHumanId = async (
  client: CoreClientLike,
  taskId: string,
  humanId: string,
): Promise<void> => {
  await client.mutation({
    updateTask: {
      __args: { id: taskId, data: { humanId } },
      id: true,
    },
  } as never);
};

export type AllocatedTaskHumanId = {
  humanId: string;
  projectId: string;
  sequence: number;
};

export const allocateTaskHumanId = async (
  projectId: string,
  client: CoreClientLike = coreClient(),
): Promise<AllocatedTaskHumanId | undefined> => {
  let project = await readProject(client, projectId);

  if (
    project === undefined ||
    typeof project.key !== 'string' ||
    project.key.length === 0
  ) {
    return undefined;
  }

  const projectKey = project.key;

  for (let attempt = 0; attempt < TASK_HUMAN_ID_MAX_ATTEMPTS; attempt += 1) {
    const expected = readTaskCounter(project);
    const sequence = expected + 1;

    if (await casBumpProjectCounter(client, projectId, expected, sequence)) {
      return {
        humanId: computeTaskHumanId(projectKey, sequence),
        projectId,
        sequence,
      };
    }

    // A lost CAS only means our counter snapshot is stale: re-read instead of
    // guessing the winner's increment, then let the loop retry.
    const refreshed = await readProject(client, projectId);

    if (refreshed === undefined) {
      return undefined;
    }

    project = refreshed;
  }

  throw new Error(TASK_HUMAN_ID_REFUSED);
};

export type TaskHumanIdFlowResult = { skipped: string } | { humanId: string };

// Le flux complet, extrait du logic function pour que node:test l'exerce sans
// importer twenty-sdk/define.
export const assignTaskHumanId = async (
  record: TaskHumanIdTarget | undefined,
  eventName: string,
  client: CoreClientLike = coreClient(),
): Promise<TaskHumanIdFlowResult> => {
  if (!eventName.endsWith('.created') && !eventName.endsWith('.updated')) {
    return { skipped: 'not-relevant-event' };
  }

  if (record === undefined) {
    return { skipped: 'no-record' };
  }

  // Idempotent join: a task already numbered keeps its identifier for life,
  // even when a later edit changes its project FK — and the humanId write
  // itself fires a task.updated that must short-circuit here.
  if (hasTaskHumanId(record)) {
    return { skipped: 'already-numbered' };
  }

  const projectId = readTaskProjectId(record);

  if (projectId === undefined) {
    return { skipped: 'no-project' };
  }

  const allocated = await allocateTaskHumanId(projectId, client);

  if (allocated === undefined) {
    return { skipped: 'project-missing-key' };
  }

  await updateTaskHumanId(client, record.id, allocated.humanId);

  return { humanId: allocated.humanId };
};
