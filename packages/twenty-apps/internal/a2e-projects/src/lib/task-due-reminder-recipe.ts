// Recette « tâche due → rappel Agenda » (US-107).
//
// Partie pure : à partir d'une tâche dont l'échéance approche, elle dérive la
// clé de corrélation C5 puis le plan d'écritures (un événement de calendrier
// portant le rappel). Le plan est calculable sans moteur ni Core API.
//
// AUCUN MOTEUR DE RAPPEL N'EST CRÉÉ ICI : la recette réutilise la primitive
// native existante — un `calendarEvent` avec `reminderMinutes`, consommé par la
// boucle de rappels du calendrier (P4C.4). L'événement est « local » (sans
// canal connecté), comme les événements créés à la main.

import {
  deriveRecipeCorrelationKey,
  type RecipeCorrelationSource,
} from './recipe-correlation.ts';

export const TASK_DUE_REMINDER_RECIPE_KEY = 'task-due-reminder';
export const TASK_DUE_REMINDER_RECIPE_VERSION = 1;

export const TASK_DUE_REMINDER_SOURCE_OBJECT = 'task';

// Combien de minutes avant l'échéance le rappel se déclenche. Séparé de la
// durée de l'événement pour que l'événement « rappel » reste un repère court.
export const TASK_DUE_REMINDER_MINUTES = 30;
export const TASK_DUE_REMINDER_EVENT_MINUTES = 30;

export const TASK_DUE_REMINDER_TITLE_PREFIX = 'Rappel';
export const TASK_DUE_REMINDER_FALLBACK_TITLE = 'Tâche à échéance';

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export type TaskDueSnapshot = {
  id: string;
  title?: string | null;
  dueAt?: string | null;
};

export type TaskDueReminderRecipeInput = {
  task: TaskDueSnapshot;
  workspaceId?: string | null;
};

export type TaskDueReminderEventWrite = {
  kind: 'CREATE_REMINDER';
  correlationKey: string;
  writes: {
    object: 'calendarEvent';
    title: string;
    startsAt: string;
    endsAt: string;
    reminderMinutes: number;
    iCalUid: string;
  };
};

export type TaskDueReminderRecipePlan = {
  correlationKey: string;
  steps: TaskDueReminderEventWrite[];
};

export const deriveTaskDueReminderCorrelationKey = (
  source: Omit<RecipeCorrelationSource, 'recipeKey' | 'version' | 'sourceObject'>,
): string =>
  deriveRecipeCorrelationKey({
    recipeKey: TASK_DUE_REMINDER_RECIPE_KEY,
    version: TASK_DUE_REMINDER_RECIPE_VERSION,
    sourceObject: TASK_DUE_REMINDER_SOURCE_OBJECT,
    workspaceId: source.workspaceId,
    sourceRecordId: source.sourceRecordId,
  });

export const deriveTaskDueReminderTitle = (
  taskTitle: string | null | undefined,
): string => {
  const trimmed = (taskTitle ?? '').trim();

  return trimmed.length > 0
    ? `${TASK_DUE_REMINDER_TITLE_PREFIX} – ${trimmed}`
    : `${TASK_DUE_REMINDER_TITLE_PREFIX} – ${TASK_DUE_REMINDER_FALLBACK_TITLE}`;
};

const parseDueAt = (value: string | null | undefined): Date => {
  const date = new Date(value ?? '');

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Date d’échéance invalide : « ${value ?? ''} ».`);
  }

  return date;
};

export const buildTaskDueReminderRecipePlan = (
  input: TaskDueReminderRecipeInput,
): TaskDueReminderRecipePlan => {
  const correlationKey = deriveTaskDueReminderCorrelationKey({
    sourceRecordId: input.task.id,
    workspaceId: input.workspaceId,
  });
  const dueAtDate = parseDueAt(input.task.dueAt);
  const startsAt = dueAtDate.toISOString();
  const endsAt = new Date(
    dueAtDate.getTime() + TASK_DUE_REMINDER_EVENT_MINUTES * MILLISECONDS_PER_MINUTE,
  ).toISOString();

  return {
    correlationKey,
    steps: [
      {
        kind: 'CREATE_REMINDER',
        correlationKey,
        writes: {
          object: 'calendarEvent',
          title: deriveTaskDueReminderTitle(input.task.title),
          startsAt,
          endsAt,
          reminderMinutes: TASK_DUE_REMINDER_MINUTES,
          // `iCalUid` est le marqueur d'identité natif d'un événement : on y
          // persiste la clé de corrélation pour qu'un rejeu retrouve l'événement
          // déjà créé au lieu d'en empiler un second.
          iCalUid: correlationKey,
        },
      },
    ],
  };
};
