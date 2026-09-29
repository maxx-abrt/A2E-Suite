import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  FILE_REVIEW_RECIPE_KEY,
  FILE_REVIEW_RECIPE_VERSION,
  buildFileReviewRecipePlan,
  deriveFileReviewCorrelationKey,
  deriveFileReviewTaskTitle,
  type FileReviewRecipeInput,
} from '../file-review-recipe.ts';

// Recette fichier → tâche de relecture — partie pure : clé de corrélation C5,
// titre de la tâche et plan d'écritures (dégradation sans projet incluse).

const file = { id: 'document-1', fileName: 'contrat.pdf', projectId: 'project-1' };

const planInput = (
  overrides: Partial<FileReviewRecipeInput> = {},
): FileReviewRecipeInput => ({
  file,
  workspaceId: 'workspace-1',
  ...overrides,
});

test('the correlation key is deterministic for a replayed trigger', () => {
  const first = deriveFileReviewCorrelationKey({
    sourceRecordId: 'document-1',
    workspaceId: 'workspace-1',
  });

  assert.equal(
    first,
    `${FILE_REVIEW_RECIPE_KEY}@v${FILE_REVIEW_RECIPE_VERSION}:workspace-1:document:document-1`,
  );
  assert.equal(
    first,
    deriveFileReviewCorrelationKey({
      sourceRecordId: 'document-1',
      workspaceId: 'workspace-1',
    }),
  );
});

test('the review task title carries the file name, with a fallback', () => {
  assert.equal(deriveFileReviewTaskTitle('contrat.pdf'), 'Relecture – contrat.pdf');
  assert.equal(
    deriveFileReviewTaskTitle('  '),
    'Relecture – fichier du projet',
  );
  assert.equal(
    deriveFileReviewTaskTitle(null),
    'Relecture – fichier du projet',
  );
});

test('the plan writes a review task in the target project', () => {
  const plan = buildFileReviewRecipePlan(planInput());

  assert.deepEqual(plan.skipped, []);
  assert.equal(plan.steps.length, 1);
  assert.deepEqual(plan.steps[0], {
    kind: 'CREATE_TASK',
    correlationKey: plan.correlationKey,
    writes: {
      object: 'task',
      title: 'Relecture – contrat.pdf',
      projectId: 'project-1',
      recipeCorrelationKey: plan.correlationKey,
    },
  });
});

test('a file without a project plans nothing and states the reason', () => {
  const plan = buildFileReviewRecipePlan(
    planInput({ file: { ...file, projectId: null } }),
  );

  assert.deepEqual(plan.steps, []);
  assert.deepEqual(plan.skipped, [
    { kind: 'CREATE_TASK', reason: 'PROJECT_NOT_LINKED' },
  ]);
});
