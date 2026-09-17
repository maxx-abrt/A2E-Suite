import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  computeRecurringTaskOccurrences,
  resolveRecurrenceWindow,
  type RecurringTaskGeneratorInput,
  type RecurringTaskOccurrence,
} from '../../lib/recurring-task-generator.ts';

// L'ÉTAPE DU MOTEUR DE WORKFLOW.
//
// Le workflow « générateur de tâches récurrentes » déclenche cette action via
// le cron natif de Twenty puis exécute ce logic function comme n'importe
// quelle autre étape : pas de second bus d'événements, pas de second moteur.
//
// Idempotence sans champ de provenance : avant de créer une occurrence, on
// cherche une tâche du même projet avec le même titre et la même échéance.
// Le cron peut donc être relancé (retry, rejeu d'un run) sans dupliquer le
// travail. La fenêtre par défaut couvre les dernières 24 h pour qu'un cron
// quotidien voie chaque occurrence exactement une fois.

export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

export type RecurringTaskGeneratorResult = {
  created: number;
  skipped: number;
  dueAt: string[];
};

export const coreClient = (): CoreApiClient => new CoreApiClient();

const findExistingTaskId = async (
  client: CoreClientLike,
  occurrence: RecurringTaskOccurrence,
): Promise<string | undefined> => {
  const result = (await client.query({
    tasks: {
      __args: {
        filter: {
          title: { eq: occurrence.title },
          dueAt: { eq: occurrence.dueAt },
          projectId: { eq: occurrence.projectId },
        },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { tasks?: { edges?: { node: { id: string } }[] } };

  return result?.tasks?.edges?.[0]?.node?.id;
};

const createRecurringTask = async (
  client: CoreClientLike,
  occurrence: RecurringTaskOccurrence,
): Promise<void> => {
  await client.mutation({
    createTasks: {
      __args: {
        data: [
          {
            title: occurrence.title,
            dueAt: occurrence.dueAt,
            projectId: occurrence.projectId,
            position: 'last',
            ...(occurrence.projectStatus === undefined
              ? {}
              : { projectStatus: occurrence.projectStatus }),
          },
        ],
      },
      id: true,
    },
  } as never);
};

export const generateRecurringTasks = async (
  input: RecurringTaskGeneratorInput,
  now: Date,
  client: CoreClientLike = coreClient(),
): Promise<RecurringTaskGeneratorResult> => {
  const window = resolveRecurrenceWindow(input, now);
  const occurrences = computeRecurringTaskOccurrences(input.template, window);
  const result: RecurringTaskGeneratorResult = {
    created: 0,
    skipped: 0,
    dueAt: [],
  };

  for (const occurrence of occurrences) {
    const existingTaskId = await findExistingTaskId(client, occurrence);

    if (existingTaskId !== undefined) {
      result.skipped += 1;
      continue;
    }

    await createRecurringTask(client, occurrence);
    result.created += 1;
    result.dueAt.push(occurrence.dueAt);
  }

  return result;
};
