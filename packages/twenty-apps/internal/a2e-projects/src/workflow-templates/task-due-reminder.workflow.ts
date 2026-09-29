import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';

// LA RECETTE « TÂCHE À ÉCHÉANCE → RAPPEL AGENDA » (US-107, M9c).
//
// Vocabulaire du moteur natif : déclencheur DATABASE_EVENT sur la mise à jour
// d'une tâche, puis une étape LOGIC_FUNCTION qui crée le rappel. Le rappel
// réutilise la primitive native existante : un `calendarEvent` portant
// `reminderMinutes`, consommé par la boucle de rappels du calendrier (P4C.4).
// Aucun moteur de notification n'est construit ici.
//
// Recette OPT-IN : rien n'est matérialisé ni activé à l'installation. L'étape
// se dégrade proprement quand l'échéance est absente ou invalide (l'action
// renvoie alors INVALID_INPUT au lieu d'échouer).

export const TASK_DUE_REMINDER_WORKFLOW_NAME = 'Tâche à échéance → rappel Agenda';

export const TASK_DUE_REMINDER_STEP_LABEL = 'Créer le rappel Agenda';

export const TASK_DUE_REMINDER_STEP_ID = 'c31b0000-0014-4000-8000-000000000022';

export const TASK_DUE_REMINDER_TRIGGER_EVENT_NAME = 'task.updated';

export type TaskDueReminderWorkflowTrigger = {
  name: string;
  type: 'DATABASE_EVENT';
  nextStepIds: string[];
  settings: {
    eventName: typeof TASK_DUE_REMINDER_TRIGGER_EVENT_NAME;
    objectType: 'task';
    outputSchema: Record<string, never>;
    filter: {
      stepFilterGroups: Record<string, never>[];
      stepFilters: Record<string, never>[];
    };
  };
};

export type TaskDueReminderWorkflowStep = {
  id: string;
  name: string;
  type: 'LOGIC_FUNCTION';
  valid: boolean;
  nextStepIds?: string[] | null;
  settings: {
    input: {
      logicFunctionId: string;
      logicFunctionInput: {
        taskId: string;
        taskTitle?: string;
        dueAt?: string;
      };
    };
    outputSchema: Record<string, never>;
    errorHandlingOptions: {
      retryOnFailure: { value: number };
      continueOnFailure: { value: boolean };
    };
  };
};

export type TaskDueReminderWorkflow = {
  name: string;
  description: string;
  trigger: TaskDueReminderWorkflowTrigger;
  steps: TaskDueReminderWorkflowStep[];
};

export const buildTaskDueReminderWorkflow = (options?: {
  stepId?: string;
}): TaskDueReminderWorkflow => {
  const stepId = options?.stepId ?? TASK_DUE_REMINDER_STEP_ID;

  return {
    name: TASK_DUE_REMINDER_WORKFLOW_NAME,
    description:
      'Crée un rappel Agenda à l’échéance d’une tâche, en réutilisant la primitive de rappel du calendrier natif.',
    trigger: {
      name: 'Tâche mise à jour',
      type: 'DATABASE_EVENT',
      nextStepIds: [stepId],
      settings: {
        eventName: TASK_DUE_REMINDER_TRIGGER_EVENT_NAME,
        objectType: 'task',
        outputSchema: {},
        filter: { stepFilterGroups: [], stepFilters: [] },
      },
    },
    steps: [
      {
        id: stepId,
        name: TASK_DUE_REMINDER_STEP_LABEL,
        type: 'LOGIC_FUNCTION',
        valid: true,
        settings: {
          input: {
            logicFunctionId: LOGIC_FUNCTION_IDS.taskDueReminder,
            logicFunctionInput: {
              taskId: '{{trigger.properties.after.id}}',
              taskTitle: '{{trigger.properties.after.title}}',
              dueAt: '{{trigger.properties.after.dueAt}}',
            },
          },
          outputSchema: {},
          errorHandlingOptions: {
            retryOnFailure: { value: 0 },
            continueOnFailure: { value: false },
          },
        },
      },
    ],
  };
};

export type TaskDueReminderWorkflowValidation = {
  valid: boolean;
  errors: string[];
};

export const validateTaskDueReminderWorkflow = (
  workflow: TaskDueReminderWorkflow,
): TaskDueReminderWorkflowValidation => {
  const errors: string[] = [];
  const { trigger, steps } = workflow;

  if (trigger.type !== 'DATABASE_EVENT') {
    errors.push(
      'Le déclencheur doit être un événement de base de données (DATABASE_EVENT).',
    );
  } else if (
    trigger.settings.eventName !== TASK_DUE_REMINDER_TRIGGER_EVENT_NAME
  ) {
    errors.push(
      'La recette doit écouter la mise à jour d’une tâche (task.updated).',
    );
  }

  if (steps.length !== 1) {
    errors.push('La recette doit contenir exactement une étape.');
  }

  const [step] = steps;

  if (step?.type !== 'LOGIC_FUNCTION') {
    errors.push(
      'L’étape doit être une action LOGIC_FUNCTION du moteur natif.',
    );
  }

  if (step?.settings.input.logicFunctionId !== LOGIC_FUNCTION_IDS.taskDueReminder) {
    errors.push(
      'L’étape doit créer le rappel Agenda (action task-due-reminder).',
    );
  }

  if (trigger.nextStepIds[0] !== step?.id) {
    errors.push('Le déclencheur doit être relié à l’étape de création.');
  }

  for (const candidate of steps) {
    const actionId = candidate.settings.input.logicFunctionId.toLowerCase();

    if (actionId.includes('invoice') || actionId.includes('accounting')) {
      errors.push(
        'La recette ne doit pas créer d’écriture de facturation (volet P7 exclu).',
      );
    }
  }

  return { valid: errors.length === 0, errors };
};
