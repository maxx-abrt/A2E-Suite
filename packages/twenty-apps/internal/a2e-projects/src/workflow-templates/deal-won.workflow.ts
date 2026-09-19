import {
  LOGIC_FUNCTION_IDS,
  STANDARD_FIELD_UNIVERSAL_IDENTIFIERS,
} from '../constants/universal-identifiers.ts';
import { DEAL_WON_STAGE } from '../lib/deal-won-recipe.ts';

// LA RECETTE DE WORKFLOW « AFFAIRE GAGNÉE » (P9.3).
//
// Une « recette de workflow » est une automatisation éditable exprimée dans le
// vocabulaire du moteur natif de Twenty : un déclencheur DATABASE_EVENT sur la
// transition d'étape de l'opportunité, puis des étapes LOGIC_FUNCTION qui
// pointent sur les actions déclarées au manifeste ci-dessus. Le moteur qui
// planifie et exécute la recette est donc le moteur existant : pas de second
// bus d'événements, pas de second ordonnanceur dans l'app.
//
// La recette est OPT-IN par construction : le manifeste d'application n'a pas
// d'entité workflow, donc rien ne se matérialise ni ne s'active à
// l'installation. L'administrateur prévisualise les écritures
// (`buildDealWonRecipePlan`) puis matérialise explicitement le workflow via le
// moteur (createWorkflowVersionStep/Edge) et l'active lui-même.
//
// Le volet « brouillon de facture » de la recette générique est EXCLU : il est
// bloqué en amont par P7 (A2E Accounting) et n'est donc pas déclaré ici.

export const DEAL_WON_WORKFLOW_NAME = 'Affaire gagnée → projet + canal';

export const DEAL_WON_PROJECT_STEP_LABEL = 'Créer le projet';

export const DEAL_WON_CHANNEL_STEP_LABEL = 'Créer le canal du projet';

export const DEAL_WON_PROJECT_STEP_ID = 'c31b0000-0014-4000-8000-000000000010';

export const DEAL_WON_CHANNEL_STEP_ID = 'c31b0000-0014-4000-8000-000000000011';

export type DealWonStepFilterGroup = {
  id: string;
  logicalOperator: 'AND' | 'OR';
  parentStepFilterGroupId?: string;
  positionInStepFilterGroup?: number;
};

export type DealWonStepFilter = {
  id: string;
  type: string;
  stepOutputKey: string;
  operand: 'IS' | 'IS_NOT';
  value: string;
  stepFilterGroupId: string;
  positionInStepFilterGroup?: number;
  fieldMetadataId?: string;
};

export type DealWonWorkflowTrigger = {
  name: string;
  type: 'DATABASE_EVENT';
  nextStepIds: string[];
  settings: {
    eventName: 'opportunity.updated';
    objectType: 'opportunity';
    outputSchema: Record<string, never>;
    filter: {
      stepFilterGroups: DealWonStepFilterGroup[];
      stepFilters: DealWonStepFilter[];
    };
  };
};

export type DealWonWorkflowStep = {
  id: string;
  name: string;
  type: 'LOGIC_FUNCTION';
  valid: boolean;
  nextStepIds?: string[] | null;
  settings: {
    input: {
      logicFunctionId: string;
      logicFunctionInput: Record<string, unknown>;
    };
    outputSchema: Record<string, never>;
    errorHandlingOptions: {
      retryOnFailure: { value: number };
      continueOnFailure: { value: boolean };
    };
  };
};

export type DealWonWorkflow = {
  name: string;
  description: string;
  trigger: DealWonWorkflowTrigger;
  steps: DealWonWorkflowStep[];
};

export type DealWonWorkflowInput = {
  opportunityId: string;
  opportunityName: string;
  companyId?: string | null;
  workspaceId?: string | null;
  actorId?: string | null;
};

export type BuildDealWonWorkflowOptions = {
  input: DealWonWorkflowInput;
  isChatInstalled: boolean;
  wonStage?: string;
  projectStepId?: string;
  channelStepId?: string;
};

const DEAL_WON_FILTER_GROUP_ID = 'c31b0000-0015-4000-8000-000000000001';
const DEAL_WON_STAGE_FILTER_ID = 'c31b0000-0015-4000-8000-000000000002';

const buildStageFilter = (
  wonStage: string,
): {
  stepFilterGroups: DealWonStepFilterGroup[];
  stepFilters: DealWonStepFilter[];
} => ({
  stepFilterGroups: [
    {
      id: DEAL_WON_FILTER_GROUP_ID,
      logicalOperator: 'AND',
      positionInStepFilterGroup: 0,
    },
  ],
  stepFilters: [
    {
      id: DEAL_WON_STAGE_FILTER_ID,
      type: 'SELECT',
      operand: 'IS',
      stepOutputKey: '{{trigger.properties.after.stage}}',
      value: wonStage,
      stepFilterGroupId: DEAL_WON_FILTER_GROUP_ID,
      positionInStepFilterGroup: 0,
      fieldMetadataId: STANDARD_FIELD_UNIVERSAL_IDENTIFIERS.opportunityStage,
    },
  ],
});

export const buildDealWonWorkflow = (
  options: BuildDealWonWorkflowOptions,
): DealWonWorkflow => {
  const wonStage = options.wonStage ?? DEAL_WON_STAGE;
  const projectStepId = options.projectStepId ?? DEAL_WON_PROJECT_STEP_ID;
  const channelStepId = options.channelStepId ?? DEAL_WON_CHANNEL_STEP_ID;
  const { input } = options;

  const projectStep: DealWonWorkflowStep = {
    id: projectStepId,
    name: DEAL_WON_PROJECT_STEP_LABEL,
    type: 'LOGIC_FUNCTION',
    valid: true,
    ...(options.isChatInstalled ? { nextStepIds: [channelStepId] } : {}),
    settings: {
      input: {
        logicFunctionId: LOGIC_FUNCTION_IDS.dealWonCreateProject,
        logicFunctionInput: {
          opportunityId: input.opportunityId,
          opportunityName: input.opportunityName,
          ...(input.companyId === undefined || input.companyId === null
            ? {}
            : { companyId: input.companyId }),
          ...(input.workspaceId === undefined || input.workspaceId === null
            ? {}
            : { workspaceId: input.workspaceId }),
          ...(input.actorId === undefined || input.actorId === null
            ? {}
            : { actorId: input.actorId }),
        },
      },
      outputSchema: {},
      errorHandlingOptions: {
        retryOnFailure: { value: 0 },
        continueOnFailure: { value: false },
      },
    },
  };

  const steps: DealWonWorkflowStep[] = [projectStep];

  if (options.isChatInstalled) {
    steps.push({
      id: channelStepId,
      name: DEAL_WON_CHANNEL_STEP_LABEL,
      type: 'LOGIC_FUNCTION',
      valid: true,
      settings: {
        input: {
          logicFunctionId: LOGIC_FUNCTION_IDS.dealWonCreateChannel,
          logicFunctionInput: {
            projectId: `{{${projectStepId}.projectId}}`,
            projectName: `{{${projectStepId}.projectName}}`,
            correlationKey: `{{${projectStepId}.correlationKey}}`,
          },
        },
        outputSchema: {},
        errorHandlingOptions: {
          retryOnFailure: { value: 0 },
          continueOnFailure: { value: false },
        },
      },
    });
  }

  return {
    name: DEAL_WON_WORKFLOW_NAME,
    description:
      'Crée un projet (et, si A2E Chat est installé, un canal lié) quand une opportunité passe à l’étape gagnée, sur le moteur de workflow natif de Twenty.',
    trigger: {
      name: 'Opportunité gagnée',
      type: 'DATABASE_EVENT',
      nextStepIds: [projectStepId],
      settings: {
        eventName: 'opportunity.updated',
        objectType: 'opportunity',
        outputSchema: {},
        filter: buildStageFilter(wonStage),
      },
    },
    steps,
  };
};

export type DealWonWorkflowValidation = {
  valid: boolean;
  errors: string[];
};

export const validateDealWonWorkflow = (
  workflow: DealWonWorkflow,
): DealWonWorkflowValidation => {
  const errors: string[] = [];
  const { trigger, steps } = workflow;

  if (trigger.type !== 'DATABASE_EVENT') {
    errors.push(
      'Le déclencheur doit être un événement de base de données (DATABASE_EVENT).',
    );
  } else if (trigger.settings.eventName !== 'opportunity.updated') {
    errors.push(
      'La recette doit écouter la transition d’étape de l’opportunité (opportunity.updated).',
    );
  }

  if (steps.length < 1) {
    errors.push(
      'La recette doit contenir au moins l’étape de création du projet.',
    );
  }

  const [projectStep, channelStep] = steps;

  if (
    projectStep?.settings.input.logicFunctionId !==
    LOGIC_FUNCTION_IDS.dealWonCreateProject
  ) {
    errors.push(
      'La première étape doit créer le projet (action dealWonCreateProject).',
    );
  }

  if (projectStep?.type !== 'LOGIC_FUNCTION') {
    errors.push(
      'Les étapes doivent être des actions LOGIC_FUNCTION du moteur natif.',
    );
  }

  if (trigger.nextStepIds[0] !== projectStep?.id) {
    errors.push(
      'Le déclencheur doit être relié à l’étape de création du projet.',
    );
  }

  if (steps.length > 2) {
    errors.push(
      'La recette ne doit pas contenir plus de deux étapes (projet, canal).',
    );
  }

  if (channelStep !== undefined) {
    if (
      channelStep.settings.input.logicFunctionId !==
      LOGIC_FUNCTION_IDS.dealWonCreateChannel
    ) {
      errors.push(
        'La seconde étape doit créer le canal du projet (action dealWonCreateChannel).',
      );
    }

    if (channelStep.type !== 'LOGIC_FUNCTION') {
      errors.push(
        'L’étape de canal doit être une action LOGIC_FUNCTION du moteur natif.',
      );
    }

    if (projectStep?.nextStepIds?.[0] !== channelStep.id) {
      errors.push(
        'L’étape projet doit être reliée à l’étape de création du canal.',
      );
    }
  }

  // Le volet facture est volontairement absent (P7 bloque la facturation) :
  // aucune étape ne doit référencer une action de facturation.
  for (const step of steps) {
    const actionId = step.settings.input.logicFunctionId.toLowerCase();

    if (actionId.includes('invoice') || actionId.includes('accounting')) {
      errors.push(
        'La recette ne doit pas créer de brouillon de facture (volet P7 exclu).',
      );
    }
  }

  return { valid: errors.length === 0, errors };
};
