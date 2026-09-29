import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';

// LA RECETTE « FICHIER DÉPOSÉ → TÂCHE DE RELECTURE » (US-107, M9c).
//
// Vocabulaire du moteur natif : déclencheur DATABASE_EVENT sur la création
// d'un document rattaché à un projet, puis une étape LOGIC_FUNCTION qui crée
// la tâche de relecture. Le document est le porteur du dépôt (le champ
// `project` qu'A2E Projects pose sur l'objet `document`) ; l'étape se dégrade
// proprement quand ce projet est absent.
//
// Recette OPT-IN : rien n'est matérialisé ni activé à l'installation.

export const FILE_REVIEW_WORKFLOW_NAME = 'Fichier déposé → tâche de relecture';

export const FILE_REVIEW_STEP_LABEL = 'Créer la tâche de relecture';

export const FILE_REVIEW_STEP_ID = 'c31b0000-0014-4000-8000-000000000021';

export const FILE_REVIEW_TRIGGER_EVENT_NAME = 'document.created';

export type FileReviewWorkflowTrigger = {
  name: string;
  type: 'DATABASE_EVENT';
  nextStepIds: string[];
  settings: {
    eventName: typeof FILE_REVIEW_TRIGGER_EVENT_NAME;
    objectType: 'document';
    outputSchema: Record<string, never>;
    filter: {
      stepFilterGroups: Record<string, never>[];
      stepFilters: Record<string, never>[];
    };
  };
};

export type FileReviewWorkflowStep = {
  id: string;
  name: string;
  type: 'LOGIC_FUNCTION';
  valid: boolean;
  nextStepIds?: string[] | null;
  settings: {
    input: {
      logicFunctionId: string;
      logicFunctionInput: {
        fileId: string;
        fileName?: string;
        projectId?: string;
      };
    };
    outputSchema: Record<string, never>;
    errorHandlingOptions: {
      retryOnFailure: { value: number };
      continueOnFailure: { value: boolean };
    };
  };
};

export type FileReviewWorkflow = {
  name: string;
  description: string;
  trigger: FileReviewWorkflowTrigger;
  steps: FileReviewWorkflowStep[];
};

export const buildFileReviewWorkflow = (options?: {
  stepId?: string;
}): FileReviewWorkflow => {
  const stepId = options?.stepId ?? FILE_REVIEW_STEP_ID;

  return {
    name: FILE_REVIEW_WORKFLOW_NAME,
    description:
      'Crée une tâche « Relecture » quand un fichier est déposé dans un projet, sur le moteur de workflow natif de Twenty.',
    trigger: {
      name: 'Fichier déposé',
      type: 'DATABASE_EVENT',
      nextStepIds: [stepId],
      settings: {
        eventName: FILE_REVIEW_TRIGGER_EVENT_NAME,
        objectType: 'document',
        outputSchema: {},
        filter: { stepFilterGroups: [], stepFilters: [] },
      },
    },
    steps: [
      {
        id: stepId,
        name: FILE_REVIEW_STEP_LABEL,
        type: 'LOGIC_FUNCTION',
        valid: true,
        settings: {
          input: {
            logicFunctionId: LOGIC_FUNCTION_IDS.fileReviewTask,
            logicFunctionInput: {
              fileId: '{{trigger.properties.after.id}}',
              fileName: '{{trigger.properties.after.title}}',
              projectId: '{{trigger.properties.after.projectId}}',
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

export type FileReviewWorkflowValidation = {
  valid: boolean;
  errors: string[];
};

export const validateFileReviewWorkflow = (
  workflow: FileReviewWorkflow,
): FileReviewWorkflowValidation => {
  const errors: string[] = [];
  const { trigger, steps } = workflow;

  if (trigger.type !== 'DATABASE_EVENT') {
    errors.push(
      'Le déclencheur doit être un événement de base de données (DATABASE_EVENT).',
    );
  } else if (trigger.settings.eventName !== FILE_REVIEW_TRIGGER_EVENT_NAME) {
    errors.push(
      'La recette doit écouter le dépôt d’un document (document.created).',
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

  if (step?.settings.input.logicFunctionId !== LOGIC_FUNCTION_IDS.fileReviewTask) {
    errors.push(
      'L’étape doit créer la tâche de relecture (action file-review-task).',
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
