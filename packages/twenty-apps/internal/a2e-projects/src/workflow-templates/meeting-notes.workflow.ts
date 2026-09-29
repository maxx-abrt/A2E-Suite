import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';

// LA RECETTE « RÉUNION → PAGE DE NOTES » (US-107, M9c).
//
// Une recette de workflow est une automatisation éditable exprimée dans le
// vocabulaire du moteur natif de Twenty : un déclencheur DATABASE_EVENT sur la
// création d'un événement de calendrier, puis une étape LOGIC_FUNCTION qui
// pointe sur l'action déclarée au manifeste. Le moteur qui exécute la recette
// est donc le moteur existant : pas de second bus d'événements, pas de second
// ordonnanceur dans l'app.
//
// La recette est OPT-IN : le manifeste d'application n'a pas d'entité workflow,
// donc rien ne se matérialise ni ne s'active à l'installation. Le plan
// d'écritures (`buildMeetingNotesRecipePlan`) est prévisualisable avant
// matérialisation explicite via le moteur.

export const MEETING_NOTES_WORKFLOW_NAME = 'Réunion → page de notes';

export const MEETING_NOTES_STEP_LABEL = 'Créer la page de notes';

export const MEETING_NOTES_STEP_ID = 'c31b0000-0014-4000-8000-000000000020';

export type MeetingNotesWorkflowTrigger = {
  name: string;
  type: 'DATABASE_EVENT';
  nextStepIds: string[];
  settings: {
    eventName: 'calendarEvent.created';
    objectType: 'calendarEvent';
    outputSchema: Record<string, never>;
    filter: {
      stepFilterGroups: Record<string, never>[];
      stepFilters: Record<string, never>[];
    };
  };
};

export type MeetingNotesWorkflowStep = {
  id: string;
  name: string;
  type: 'LOGIC_FUNCTION';
  valid: boolean;
  nextStepIds?: string[] | null;
  settings: {
    input: {
      logicFunctionId: string;
      logicFunctionInput: {
        eventId: string;
        eventTitle?: string;
      };
    };
    outputSchema: Record<string, never>;
    errorHandlingOptions: {
      retryOnFailure: { value: number };
      continueOnFailure: { value: boolean };
    };
  };
};

export type MeetingNotesWorkflow = {
  name: string;
  description: string;
  trigger: MeetingNotesWorkflowTrigger;
  steps: MeetingNotesWorkflowStep[];
};

export const MEETING_NOTES_TRIGGER_EVENT_NAME = 'calendarEvent.created';

export const buildMeetingNotesWorkflow = (options?: {
  stepId?: string;
}): MeetingNotesWorkflow => {
  const stepId = options?.stepId ?? MEETING_NOTES_STEP_ID;

  return {
    name: MEETING_NOTES_WORKFLOW_NAME,
    description:
      'Crée une page de notes Bureau à chaque réunion planifiée, sur le moteur de workflow natif de Twenty.',
    trigger: {
      name: 'Réunion créée',
      type: 'DATABASE_EVENT',
      nextStepIds: [stepId],
      settings: {
        eventName: MEETING_NOTES_TRIGGER_EVENT_NAME,
        objectType: 'calendarEvent',
        outputSchema: {},
        filter: { stepFilterGroups: [], stepFilters: [] },
      },
    },
    steps: [
      {
        id: stepId,
        name: MEETING_NOTES_STEP_LABEL,
        type: 'LOGIC_FUNCTION',
        valid: true,
        settings: {
          input: {
            logicFunctionId: LOGIC_FUNCTION_IDS.meetingNotesPage,
            logicFunctionInput: {
              eventId: '{{trigger.properties.after.id}}',
              eventTitle: '{{trigger.properties.after.title}}',
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

export type MeetingNotesWorkflowValidation = {
  valid: boolean;
  errors: string[];
};

export const validateMeetingNotesWorkflow = (
  workflow: MeetingNotesWorkflow,
): MeetingNotesWorkflowValidation => {
  const errors: string[] = [];
  const { trigger, steps } = workflow;

  if (trigger.type !== 'DATABASE_EVENT') {
    errors.push(
      'Le déclencheur doit être un événement de base de données (DATABASE_EVENT).',
    );
  } else if (trigger.settings.eventName !== MEETING_NOTES_TRIGGER_EVENT_NAME) {
    errors.push(
      'La recette doit écouter la création d’une réunion (calendarEvent.created).',
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

  if (
    step?.settings.input.logicFunctionId !== LOGIC_FUNCTION_IDS.meetingNotesPage
  ) {
    errors.push(
      'L’étape doit créer la page de notes (action meeting-notes-page).',
    );
  }

  if (trigger.nextStepIds[0] !== step?.id) {
    errors.push('Le déclencheur doit être relié à l’étape de création.');
  }

  // Aucune étape facture/comptabilité : P7 bloque toujours la facturation.
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
