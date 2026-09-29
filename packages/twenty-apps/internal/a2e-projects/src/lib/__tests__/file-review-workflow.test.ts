import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import logicFunctionDefinition from '../../logic-functions/file-review-task.logic-function.ts';
import {
  FILE_REVIEW_STEP_ID,
  buildFileReviewWorkflow,
  validateFileReviewWorkflow,
  type FileReviewWorkflow,
} from '../../workflow-templates/file-review.workflow.ts';

// Deux côtés du même contrat : la recette est construite avec le vocabulaire
// déclencheur/action du moteur de workflow, et l'étape pointe sur une action que
// l'app déclare au manifeste (`dev:build` l'enregistre comme étape).

test('the review-task action ships as a manifest-declared workflow step', () => {
  assert.equal(
    logicFunctionDefinition.success,
    true,
    logicFunctionDefinition.errors.join(', '),
  );
  assert.equal(
    logicFunctionDefinition.config.universalIdentifier,
    LOGIC_FUNCTION_IDS.fileReviewTask,
  );
  assert.equal(
    logicFunctionDefinition.config.workflowActionTriggerSettings?.label,
    'Créer la tâche de relecture',
  );
});

test('the trigger is the native document creation, one logic-function step', () => {
  const workflow = buildFileReviewWorkflow();
  const { trigger, steps } = workflow;

  assert.equal(trigger.type, 'DATABASE_EVENT');
  assert.equal(trigger.settings.eventName, 'document.created');
  assert.equal(trigger.settings.objectType, 'document');
  assert.deepEqual(trigger.nextStepIds, [FILE_REVIEW_STEP_ID]);

  assert.equal(steps.length, 1);
  assert.equal(steps[0]?.id, FILE_REVIEW_STEP_ID);
  assert.equal(
    steps[0]?.settings.input.logicFunctionId,
    LOGIC_FUNCTION_IDS.fileReviewTask,
  );
  assert.deepEqual(steps[0]?.settings.input.logicFunctionInput, {
    fileId: '{{trigger.properties.after.id}}',
    fileName: '{{trigger.properties.after.title}}',
    projectId: '{{trigger.properties.after.projectId}}',
  });

  assert.deepEqual(validateFileReviewWorkflow(workflow), {
    valid: true,
    errors: [],
  });
});

test('validation rejects a foreign action and an invoice step', () => {
  const workflow = buildFileReviewWorkflow();
  const step = workflow.steps[0]!;

  const foreign: FileReviewWorkflow = {
    ...workflow,
    steps: [
      {
        ...step,
        settings: {
          ...step.settings,
          input: { ...step.settings.input, logicFunctionId: 'other-action' },
        },
      },
    ],
  };

  assert.equal(validateFileReviewWorkflow(foreign).valid, false);

  const invoiced: FileReviewWorkflow = {
    ...workflow,
    steps: [
      {
        ...step,
        settings: {
          ...step.settings,
          input: {
            ...step.settings.input,
            logicFunctionId: 'accounting-post-action',
          },
        },
      },
    ],
  };

  assert.equal(validateFileReviewWorkflow(invoiced).valid, false);
});
