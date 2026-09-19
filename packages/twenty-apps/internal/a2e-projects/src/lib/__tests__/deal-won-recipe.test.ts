import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEAL_WON_RECIPE_KEY,
  DEAL_WON_RECIPE_VERSION,
  buildDealWonEventEnvelope,
  buildDealWonRecipePlan,
  deriveDealWonChannelCorrelationKey,
  deriveDealWonChannelName,
  deriveDealWonCorrelationKey,
  deriveDealWonProjectKey,
  deriveDealWonProjectName,
  isDealWonStage,
  type DealWonRecipeInput,
} from '../deal-won-recipe.ts';

// Recette affaire gagnée — partie pure : clé de corrélation C5, garde d'étape
// gagnée et plan d'écritures (dégradation incluse). Aucune horloge ni client
// n'entre ici : le plan doit être reproductible pour être prévisualisable.

const opportunity = {
  id: 'opportunity-1',
  name: 'Refonte du site',
  stage: 'CUSTOMER',
  companyId: 'company-1',
};

const planInput = (
  overrides: Partial<DealWonRecipeInput> = {},
): DealWonRecipeInput => ({
  opportunity,
  workspaceId: 'workspace-1',
  isChatInstalled: true,
  ...overrides,
});

test('the correlation key is deterministic for a replayed trigger', () => {
  const first = deriveDealWonCorrelationKey({
    opportunityId: 'opportunity-1',
    workspaceId: 'workspace-1',
  });
  const replay = deriveDealWonCorrelationKey({
    opportunityId: 'opportunity-1',
    workspaceId: 'workspace-1',
  });

  assert.equal(first, replay);
  assert.equal(
    first,
    `${DEAL_WON_RECIPE_KEY}@v${DEAL_WON_RECIPE_VERSION}:workspace-1:opportunity:opportunity-1`,
  );

  const otherOpportunity = deriveDealWonCorrelationKey({
    opportunityId: 'opportunity-2',
    workspaceId: 'workspace-1',
  });

  assert.notEqual(first, otherOpportunity);
});

test('the channel key derives from the project key and never collides with it', () => {
  const projectKey = deriveDealWonCorrelationKey({
    opportunityId: 'opportunity-1',
    workspaceId: 'workspace-1',
  });

  assert.equal(
    deriveDealWonChannelCorrelationKey(projectKey),
    `${projectKey}:channel`,
  );
  assert.notEqual(deriveDealWonChannelCorrelationKey(projectKey), projectKey);
});

test('the C5 envelope carries type, version, workspace, source and actor', () => {
  const envelope = buildDealWonEventEnvelope(opportunity, {
    workspaceId: 'workspace-1',
    actorId: 'user-1',
  });

  assert.equal(envelope.eventType, 'opportunity.updated');
  assert.equal(envelope.eventVersion, DEAL_WON_RECIPE_VERSION);
  assert.equal(envelope.workspaceId, 'workspace-1');
  assert.equal(envelope.sourceObject, 'opportunity');
  assert.equal(envelope.sourceRecordId, 'opportunity-1');
  assert.equal(envelope.actorId, 'user-1');
  assert.equal(
    envelope.correlationKey,
    deriveDealWonCorrelationKey({
      opportunityId: 'opportunity-1',
      workspaceId: 'workspace-1',
    }),
  );
});

test('only the won stage is accepted as the trigger stage', () => {
  assert.equal(isDealWonStage('CUSTOMER'), true);
  assert.equal(isDealWonStage('PROPOSAL'), false);
  assert.equal(isDealWonStage(null), false);
  assert.equal(isDealWonStage(undefined), false);
  assert.equal(isDealWonStage('DONE', 'DONE'), true);
});

test('with chat installed the plan writes a project and a linked channel', () => {
  const plan = buildDealWonRecipePlan(planInput());

  assert.deepEqual(plan.skipped, []);
  assert.equal(plan.steps.length, 2);
  assert.deepEqual(plan.steps[0], {
    kind: 'CREATE_PROJECT',
    correlationKey: plan.correlationKey,
    writes: {
      name: 'Refonte du site',
      key: 'REFO',
      recipeCorrelationKey: plan.correlationKey,
      companyId: 'company-1',
    },
  });
  assert.deepEqual(plan.steps[1], {
    kind: 'CREATE_CHANNEL',
    correlationKey: `${plan.correlationKey}:channel`,
    writes: {
      name: 'Canal – Refonte du site',
      kind: 'PROJECT',
      visibility: 'PUBLIC',
      topic: 'Suivi du projet Refonte du site',
      projectIdSource: 'CREATED_PROJECT',
    },
  });
});

test('with chat absent the plan hides the channel step and states the reason', () => {
  const plan = buildDealWonRecipePlan(planInput({ isChatInstalled: false }));

  assert.equal(plan.steps.length, 1);
  assert.equal(plan.steps[0]?.kind, 'CREATE_PROJECT');
  assert.deepEqual(plan.skipped, [
    { kind: 'CREATE_CHANNEL', reason: 'CHAT_NOT_INSTALLED' },
  ]);
});

test('the plan never contains an invoice draft leg (P7 excluded)', () => {
  const plan = buildDealWonRecipePlan(planInput());

  for (const step of plan.steps) {
    assert.ok(['CREATE_PROJECT', 'CREATE_CHANNEL'].includes(step.kind));
    assert.ok(!JSON.stringify(step).toLowerCase().includes('invoice'));
    assert.ok(!JSON.stringify(step).toLowerCase().includes('accounting'));
  }
});

test('a missing opportunity name falls back to a usable project name and key', () => {
  assert.equal(deriveDealWonProjectName('   '), 'Affaire gagnée');
  assert.equal(deriveDealWonProjectName('Refonte du site'), 'Refonte du site');
  assert.equal(deriveDealWonProjectKey(''), 'PROJ');
  assert.equal(deriveDealWonProjectKey('Été 2026'), 'ETE2');
  assert.equal(deriveDealWonChannelName('Refonte'), 'Canal – Refonte');
});

test('a plan without a company simply omits the company relation', () => {
  const plan = buildDealWonRecipePlan(
    planInput({ opportunity: { ...opportunity, companyId: null } }),
  );

  assert.deepEqual(plan.steps[0]?.writes, {
    name: 'Refonte du site',
    key: 'REFO',
    recipeCorrelationKey: plan.correlationKey,
  });
});
