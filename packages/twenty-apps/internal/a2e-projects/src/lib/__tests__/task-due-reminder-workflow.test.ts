import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import logicFunctionDefinition from '../../logic-functions/task-due-reminder.logic-function.ts';
import {
  TASK_DUE_REMINDER_STEP_ID,
  buildTaskDueReminderWorkflow,
  validateTaskDueReminderWorkflow,
  type TaskDueReminderWorkflow,
} from '../../workflow-templates/task-due-reminder.workflow.ts';

// Deux côtés du même contrat : la recette est construite avec le vocabulaire
// déclencheur/action du moteur de workflow, et l'étape pointe sur une action que
// l'app déclare au manifeste (`dev:build` l'enregistre comme étape).

test('the reminder action ships as a manifest-declared workflow step', () => {
  assert.equal(
    logicFunctionDefinition.success,
    true,
    logicFunctionDefinition.errors.join(', '),
  );
  assert.equal(
    logicFunctionDefinition.config.universalIdentifier,
    LOGIC_FUNCTION_IDS.taskDueReminder,
  );
  assert.equal(
    logicFunctionDefinition.config.workflowActionTriggerSettings?.label,
    'Créer le rappel Agenda',
  );
});

test('the trigger is the native task update, one logic-function step', () => {
  const workflow = buildTaskDueReminderWorkflow();
  const { trigger, steps } = workflow;

  assert.equal(trigger.type, 'DATABASE_EVENT');
  assert.equal(trigger.settings.eventName, 'task.updated');
  assert.equal(trigger.settings.objectType, 'task');
  assert.deepEqual(trigger.nextStepIds, [TASK_DUE_REMINDER_STEP_ID]);

  assert.equal(steps.length, 1);
  assert.equal(steps[0]?.id, TASK_DUE_REMINDER_STEP_ID);
  assert.equal(
    steps[0]?.settings.input.logicFunctionId,
    LOGIC_FUNCTION_IDS.taskDueReminder,
  );
  assert.deepEqual(steps[0]?.settings.input.logicFunctionInput, {
    taskId: '{{trigger.properties.after.id}}',
    taskTitle: '{{trigger.properties.after.title}}',
    dueAt: '{{trigger.properties.after.dueAt}}',
  });

  assert.deepEqual(validateTaskDueReminderWorkflow(workflow), {
    valid: true,
    errors: [],
  });
});

test('validation rejects a foreign action and an invoice step', () => {
  const workflow = buildTaskDueReminderWorkflow();
  const step = workflow.steps[0]!;

  const foreign: TaskDueReminderWorkflow = {
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

  assert.equal(validateTaskDueReminderWorkflow(foreign).valid, false);

  const invoiced: TaskDueReminderWorkflow = {
    ...workflow,
    steps: [
      {
        ...step,
        settings: {
          ...step.settings,
          input: {
            ...step.settings.input,
            logicFunctionId: 'invoice-draft-action',
          },
        },
      },
    ],
  };

  assert.equal(validateTaskDueReminderWorkflow(invoiced).valid, false);
});
