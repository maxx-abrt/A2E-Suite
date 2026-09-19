import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LOGIC_FUNCTION_IDS,
  STANDARD_FIELD_UNIVERSAL_IDENTIFIERS,
} from '../../constants/universal-identifiers.ts';
import channelLogicFunction from '../../logic-functions/deal-won-create-channel.logic-function.ts';
import projectLogicFunction from '../../logic-functions/deal-won-create-project.logic-function.ts';
import {
  DEAL_WON_CHANNEL_STEP_ID,
  DEAL_WON_PROJECT_STEP_ID,
  buildDealWonWorkflow,
  validateDealWonWorkflow,
  type DealWonWorkflow,
} from '../../workflow-templates/deal-won.workflow.ts';

// Deux côtés du même contrat : la recette est construite avec le vocabulaire
// déclencheur/action du moteur de workflow, et chaque étape pointe sur une
// action que l'app déclare au manifeste (celle que `dev:build` enregistre
// comme étape de workflow).

const input = {
  opportunityId: 'opportunity-1',
  opportunityName: 'Refonte du site',
  companyId: 'company-1',
  workspaceId: 'workspace-1',
  actorId: 'user-1',
};

test('both actions ship as manifest-declared workflow steps', () => {
  assert.equal(
    projectLogicFunction.success,
    true,
    projectLogicFunction.errors.join(', '),
  );
  assert.equal(
    channelLogicFunction.success,
    true,
    channelLogicFunction.errors.join(', '),
  );
  assert.equal(
    projectLogicFunction.config.universalIdentifier,
    LOGIC_FUNCTION_IDS.dealWonCreateProject,
  );
  assert.equal(
    channelLogicFunction.config.universalIdentifier,
    LOGIC_FUNCTION_IDS.dealWonCreateChannel,
  );
  assert.equal(
    projectLogicFunction.config.workflowActionTriggerSettings?.label,
    'Créer le projet',
  );
  assert.equal(
    channelLogicFunction.config.workflowActionTriggerSettings?.label,
    'Créer le canal du projet',
  );
});

test('the trigger is the native opportunity stage transition, filtered on won', () => {
  const workflow = buildDealWonWorkflow({ input, isChatInstalled: true });
  const { trigger } = workflow;

  assert.equal(trigger.type, 'DATABASE_EVENT');
  assert.equal(trigger.settings.eventName, 'opportunity.updated');
  assert.equal(trigger.settings.objectType, 'opportunity');
  assert.deepEqual(trigger.nextStepIds, [DEAL_WON_PROJECT_STEP_ID]);

  assert.equal(trigger.settings.filter.stepFilterGroups.length, 1);
  assert.equal(
    trigger.settings.filter.stepFilterGroups[0]?.logicalOperator,
    'AND',
  );

  const stageFilter = trigger.settings.filter.stepFilters[0];

  assert.ok(stageFilter);
  assert.equal(stageFilter.operand, 'IS');
  assert.equal(stageFilter.value, 'CUSTOMER');
  assert.equal(stageFilter.stepOutputKey, '{{trigger.properties.after.stage}}');
  assert.equal(
    stageFilter.fieldMetadataId,
    STANDARD_FIELD_UNIVERSAL_IDENTIFIERS.opportunityStage,
  );
});

test('with chat installed the recipe chains project then channel with an edge', () => {
  const workflow = buildDealWonWorkflow({ input, isChatInstalled: true });

  assert.equal(workflow.steps.length, 2);

  const [projectStep, channelStep] = workflow.steps;

  assert.ok(projectStep);
  assert.ok(channelStep);
  assert.equal(projectStep.id, DEAL_WON_PROJECT_STEP_ID);
  assert.equal(
    projectStep.settings.input.logicFunctionId,
    LOGIC_FUNCTION_IDS.dealWonCreateProject,
  );
  assert.deepEqual(projectStep.nextStepIds, [DEAL_WON_CHANNEL_STEP_ID]);
  assert.deepEqual(projectStep.settings.input.logicFunctionInput, {
    opportunityId: 'opportunity-1',
    opportunityName: 'Refonte du site',
    companyId: 'company-1',
    workspaceId: 'workspace-1',
    actorId: 'user-1',
  });

  assert.equal(channelStep.id, DEAL_WON_CHANNEL_STEP_ID);
  assert.equal(
    channelStep.settings.input.logicFunctionId,
    LOGIC_FUNCTION_IDS.dealWonCreateChannel,
  );
  assert.deepEqual(channelStep.settings.input.logicFunctionInput, {
    projectId: `{{${DEAL_WON_PROJECT_STEP_ID}.projectId}}`,
    projectName: `{{${DEAL_WON_PROJECT_STEP_ID}.projectName}}`,
    correlationKey: `{{${DEAL_WON_PROJECT_STEP_ID}.correlationKey}}`,
  });
  assert.equal(channelStep.nextStepIds, undefined);

  assert.deepEqual(validateDealWonWorkflow(workflow), {
    valid: true,
    errors: [],
  });
});

test('with chat absent the recipe hides the channel step, never breaks it', () => {
  const workflow = buildDealWonWorkflow({ input, isChatInstalled: false });

  assert.equal(workflow.steps.length, 1);
  assert.equal(workflow.steps[0]?.id, DEAL_WON_PROJECT_STEP_ID);
  assert.equal(workflow.steps[0]?.nextStepIds, undefined);

  const actionIds = workflow.steps.map(
    (step) => step.settings.input.logicFunctionId,
  );

  assert.ok(!actionIds.includes(LOGIC_FUNCTION_IDS.dealWonCreateChannel));
  assert.deepEqual(validateDealWonWorkflow(workflow), {
    valid: true,
    errors: [],
  });
});

test('the recipe contains no invoice draft leg (P7 blocked upstream)', () => {
  for (const isChatInstalled of [true, false]) {
    const workflow = buildDealWonWorkflow({ input, isChatInstalled });
    const serialized = JSON.stringify(workflow).toLowerCase();

    assert.ok(!serialized.includes('invoice'));
    assert.ok(!serialized.includes('accounting'));
    assert.ok(!serialized.includes('facture'));
  }
});

test('the descriptor is opt-in: it carries no activation state', () => {
  const workflow = buildDealWonWorkflow({
    input,
    isChatInstalled: true,
  }) as DealWonWorkflow & {
    status?: unknown;
    isActive?: unknown;
  };

  assert.equal('status' in workflow, false);
  assert.equal('isActive' in workflow, false);
  assert.equal('active' in workflow, false);
});

test('validation rejects a trigger that is not the opportunity transition', () => {
  const workflow = buildDealWonWorkflow({ input, isChatInstalled: true });
  const broken: DealWonWorkflow = {
    ...workflow,
    trigger: {
      ...workflow.trigger,
      settings: {
        ...workflow.trigger.settings,
        eventName: 'company.created' as never,
      },
    },
  };

  const validation = validateDealWonWorkflow(broken);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('opportunity')));
});

test('validation rejects a step wired to a foreign action and a broken edge', () => {
  const workflow = buildDealWonWorkflow({ input, isChatInstalled: true });
  const projectStep = workflow.steps[0]!;

  const broken: DealWonWorkflow = {
    ...workflow,
    steps: [
      {
        ...projectStep,
        nextStepIds: [],
        settings: {
          ...projectStep.settings,
          input: {
            ...projectStep.settings.input,
            logicFunctionId: 'other-action',
          },
        },
      },
      workflow.steps[1]!,
    ],
  };

  const validation = validateDealWonWorkflow(broken);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) => error.includes('dealWonCreateProject')),
  );
  assert.ok(validation.errors.some((error) => error.includes('canal')));
});

test('validation rejects an invoice step smuggled into the recipe', () => {
  const workflow = buildDealWonWorkflow({ input, isChatInstalled: true });
  const broken: DealWonWorkflow = {
    ...workflow,
    steps: [
      workflow.steps[0]!,
      {
        ...workflow.steps[1]!,
        settings: {
          ...workflow.steps[1]!.settings,
          input: {
            ...workflow.steps[1]!.settings.input,
            logicFunctionId: 'invoice-draft-action',
          },
        },
      },
    ],
  };

  const validation = validateDealWonWorkflow(broken);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('facture')));
});
