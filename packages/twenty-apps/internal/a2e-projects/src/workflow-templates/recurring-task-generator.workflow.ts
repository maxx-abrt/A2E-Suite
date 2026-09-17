import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { type RecurringTaskGeneratorInput } from '../lib/recurring-task-generator.ts';

// LA RECETTE DE WORKFLOW.
//
// A « workflow recipe » is an editable automation expressed in Twenty's own
// workflow vocabulary — here a native CRON (DAYS) trigger plus one
// LOGIC_FUNCTION step. The step points at the manifest-declared
// `recurring-task-generator` action above, so the engine that schedules and
// executes this is the existing workflow engine: no second event bus and no
// second scheduler live in the app.
//
// The application manifest has no workflow entity to emit, so the recipe is
// app source data: the builder (or an installer) materializes it through the
// workflow engine's own triggers/actions. `validateRecurringTaskGeneratorWorkflow`
// keeps the shape honest at unit-test level, and `workflowActionTriggerSettings`
// on the action is what makes `npx twenty dev:build` register the step.

export const RECURRING_TASK_GENERATOR_WORKFLOW_NAME =
  'Générateur de tâches récurrentes';

export const RECURRING_TASK_GENERATOR_STEP_LABEL =
  'Générer les tâches récurrentes';

// Fixed in the app's UUID namespace: the recipe is a definition, and keeping
// the step id stable lets a re-materialized recipe be recognized rather than
// duplicated.
export const RECURRING_TASK_GENERATOR_STEP_ID =
  'c31a0000-0014-4000-8000-000000000001';

export const RECURRING_TASK_GENERATOR_DEFAULT_SCHEDULE = {
  day: 1,
  hour: 7,
  minute: 0,
} as const;

export type WorkflowCronDaysSchedule = {
  day: number;
  hour: number;
  minute: number;
};

export type RecurringTaskGeneratorWorkflowTrigger = {
  type: 'CRON';
  settings: {
    type: 'DAYS';
    schedule: WorkflowCronDaysSchedule;
    outputSchema: Record<string, never>;
  };
};

export type RecurringTaskGeneratorWorkflowStep = {
  id: string;
  name: string;
  type: 'LOGIC_FUNCTION';
  valid: boolean;
  settings: {
    input: {
      logicFunctionId: string;
      logicFunctionInput: RecurringTaskGeneratorInput;
    };
    outputSchema: Record<string, never>;
    errorHandlingOptions: {
      retryOnFailure: { value: number };
      continueOnFailure: { value: boolean };
    };
  };
};

export type RecurringTaskGeneratorWorkflow = {
  name: string;
  description: string;
  trigger: RecurringTaskGeneratorWorkflowTrigger;
  steps: RecurringTaskGeneratorWorkflowStep[];
};

export type BuildRecurringTaskGeneratorWorkflowOptions = {
  template: RecurringTaskGeneratorInput['template'];
  schedule?: WorkflowCronDaysSchedule;
  stepId?: string;
};

export const buildRecurringTaskGeneratorWorkflow = (
  options: BuildRecurringTaskGeneratorWorkflowOptions,
): RecurringTaskGeneratorWorkflow => {
  const schedule =
    options.schedule ?? RECURRING_TASK_GENERATOR_DEFAULT_SCHEDULE;

  return {
    name: RECURRING_TASK_GENERATOR_WORKFLOW_NAME,
    description:
      'Crée automatiquement les tâches récurrentes dues, sur le moteur de workflow natif de Twenty.',
    trigger: {
      type: 'CRON',
      settings: {
        type: 'DAYS',
        schedule: { ...schedule },
        outputSchema: {},
      },
    },
    steps: [
      {
        id: options.stepId ?? RECURRING_TASK_GENERATOR_STEP_ID,
        name: RECURRING_TASK_GENERATOR_STEP_LABEL,
        type: 'LOGIC_FUNCTION',
        valid: true,
        settings: {
          input: {
            logicFunctionId: LOGIC_FUNCTION_IDS.recurringTaskGenerator,
            logicFunctionInput: { template: options.template },
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

export type RecurringTaskGeneratorWorkflowValidation = {
  valid: boolean;
  errors: string[];
};

export const validateRecurringTaskGeneratorWorkflow = (
  workflow: RecurringTaskGeneratorWorkflow,
): RecurringTaskGeneratorWorkflowValidation => {
  const errors: string[] = [];
  const { trigger, steps } = workflow;

  if (trigger.type !== 'CRON') {
    errors.push('Le déclencheur doit être un cron natif (CRON).');
  } else if (trigger.settings.type !== 'DAYS') {
    errors.push('Le cron doit utiliser une planification DAYS.');
  } else {
    const { day, hour, minute } = trigger.settings.schedule;

    if (!Number.isInteger(day) || day < 1) {
      errors.push('Le pas de jours du cron doit être un entier ≥ 1.');
    }

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      errors.push('L’heure du cron doit être comprise entre 0 et 23.');
    }

    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      errors.push('Les minutes du cron doivent être comprises entre 0 et 59.');
    }
  }

  if (steps.length !== 1) {
    errors.push('La recette doit contenir exactement une étape génératrice.');
  }

  for (const step of steps) {
    if (step.type !== 'LOGIC_FUNCTION') {
      errors.push(
        'L’étape doit être une action LOGIC_FUNCTION du moteur natif.',
      );
    }

    if (
      step.settings.input.logicFunctionId !==
      LOGIC_FUNCTION_IDS.recurringTaskGenerator
    ) {
      errors.push(
        'L’étape doit référencer l’action manifeste recurring-task-generator.',
      );
    }

    if (step.valid !== true) {
      errors.push('L’étape génératrice doit être valide.');
    }
  }

  return { valid: errors.length === 0, errors };
};
