import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  buildTaskDueReminderRecipePlan,
  deriveTaskDueReminderCorrelationKey,
  type TaskDueReminderRecipePlan,
} from '../../lib/task-due-reminder-recipe.ts';

// L'ÉTAPE « CRÉER LE RAPPEL AGENDA » DE LA RECETTE TÂCHE (US-107).
//
// Le workflow « tâche à échéance → rappel Agenda » déclenche cette action via
// son événement de base de données natif. Le rappel est un `calendarEvent`
// « local » portant `reminderMinutes`, exactement la primitive que consomme la
// boucle de rappels du calendrier (P4C.4) : aucun second moteur.
//
// Idempotence : la clé de corrélation C5 est écrite dans `iCalUid` (le
// marqueur d'identité natif d'un événement) ; avant de créer, on cherche un
// événement qui la porte déjà. Un rejeu ne duplique pas le rappel.

export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

export type TaskDueReminderInput = {
  taskId?: string;
  taskTitle?: string | null;
  dueAt?: string | null;
  workspaceId?: string | null;
};

export type TaskDueReminderStatus =
  | 'CREATED'
  | 'ALREADY_EXISTS'
  | 'INVALID_INPUT';

export type TaskDueReminderResult = {
  status: TaskDueReminderStatus;
  reminderId: string | null;
  correlationKey: string | null;
};

export const coreClient = (): CoreApiClient => new CoreApiClient();

const findReminderIdByCorrelationKey = async (
  client: CoreClientLike,
  correlationKey: string,
): Promise<string | undefined> => {
  const result = (await client.query({
    calendarEvents: {
      __args: {
        filter: { iCalUid: { eq: correlationKey } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { calendarEvents?: { edges?: { node: { id: string } }[] } };

  return result?.calendarEvents?.edges?.[0]?.node?.id;
};

export const createTaskDueReminder = async (
  input: TaskDueReminderInput,
  client: CoreClientLike = coreClient(),
): Promise<TaskDueReminderResult> => {
  const taskId = typeof input.taskId === 'string' ? input.taskId.trim() : '';

  if (taskId === '') {
    return { status: 'INVALID_INPUT', reminderId: null, correlationKey: null };
  }

  const correlationKey = deriveTaskDueReminderCorrelationKey({
    sourceRecordId: taskId,
    workspaceId: input.workspaceId,
  });

  let plan: TaskDueReminderRecipePlan;

  try {
    plan = buildTaskDueReminderRecipePlan({
      task: { id: taskId, title: input.taskTitle, dueAt: input.dueAt },
      workspaceId: input.workspaceId,
    });
  } catch {
    return { status: 'INVALID_INPUT', reminderId: null, correlationKey };
  }

  const write = plan.steps[0]?.writes;

  if (write === undefined) {
    return { status: 'INVALID_INPUT', reminderId: null, correlationKey };
  }

  const existingReminderId = await findReminderIdByCorrelationKey(
    client,
    correlationKey,
  );

  if (existingReminderId !== undefined) {
    return {
      status: 'ALREADY_EXISTS',
      reminderId: existingReminderId,
      correlationKey,
    };
  }

  const result = (await client.mutation({
    createCalendarEvents: {
      __args: {
        data: [
          {
            title: write.title,
            startsAt: write.startsAt,
            endsAt: write.endsAt,
            reminderMinutes: write.reminderMinutes,
            iCalUid: write.iCalUid,
            isCanceled: false,
            isFullDay: false,
          },
        ],
      },
      id: true,
    },
  } as never)) as { createCalendarEvents?: { id: string }[] };

  return {
    status: 'CREATED',
    reminderId: result?.createCalendarEvents?.[0]?.id ?? null,
    correlationKey,
  };
};
