import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import logicFunctionDefinition from '../../logic-functions/recurring-task-generator.logic-function.ts';
import {
  RECURRING_TASK_GENERATOR_DEFAULT_SCHEDULE,
  RECURRING_TASK_GENERATOR_STEP_ID,
  buildRecurringTaskGeneratorWorkflow,
  validateRecurringTaskGeneratorWorkflow,
  type RecurringTaskGeneratorWorkflow,
} from '../../workflow-templates/recurring-task-generator.workflow.ts';
import { type RecurringTaskTemplate } from '../../lib/recurring-task-generator.ts';

// Two sides of the same contract: the recipe is built from the workflow
// engine's own trigger/action vocabulary, and the step it points at must be
// the logic function this app declares in its manifest (the declaration the
// `dev:build` manifest registers as a workflow action).

const template: RecurringTaskTemplate = {
  title: 'Revue hebdo',
  projectId: 'project-1',
  frequency: 'DAILY',
  interval: 1,
  startsAt: '2026-09-01T09:00:00.000Z',
};

test('the generator ships as a manifest-declared workflow action', () => {
  assert.equal(
    logicFunctionDefinition.success,
    true,
    logicFunctionDefinition.errors.join(', '),
  );

  const config = logicFunctionDefinition.config;

  assert.equal(
    config.universalIdentifier,
    LOGIC_FUNCTION_IDS.recurringTaskGenerator,
  );
  assert.equal(config.name, 'recurring-task-generator');
  assert.equal(
    config.workflowActionTriggerSettings?.label,
    'Générer les tâches récurrentes',
  );
  assert.equal(
    config.workflowActionTriggerSettings?.icon,
    'IconCalendarRepeat',
  );
});

test('the recipe uses the native CRON trigger with one logic-function step', () => {
  const workflow = buildRecurringTaskGeneratorWorkflow({ template });

  assert.equal(workflow.trigger.type, 'CRON');
  assert.equal(workflow.trigger.settings.type, 'DAYS');
  assert.deepEqual(
    workflow.trigger.settings.schedule,
    RECURRING_TASK_GENERATOR_DEFAULT_SCHEDULE,
  );
  assert.equal(workflow.steps.length, 1);

  const step = workflow.steps[0];

  assert.ok(step);
  assert.equal(step.id, RECURRING_TASK_GENERATOR_STEP_ID);
  assert.equal(step.type, 'LOGIC_FUNCTION');
  assert.equal(step.valid, true);
  assert.equal(
    step.settings.input.logicFunctionId,
    LOGIC_FUNCTION_IDS.recurringTaskGenerator,
  );
  assert.deepEqual(step.settings.input.logicFunctionInput, { template });
  assert.equal(step.settings.input.logicFunctionInput.window, undefined);

  assert.deepEqual(validateRecurringTaskGeneratorWorkflow(workflow), {
    valid: true,
    errors: [],
  });
});

test('the schedule and step id can be overridden per recipe instance', () => {
  const workflow = buildRecurringTaskGeneratorWorkflow({
    template,
    schedule: { day: 7, hour: 6, minute: 30 },
    stepId: 'c31a0000-0014-4000-8000-000000000002',
  });

  assert.deepEqual(workflow.trigger.settings.schedule, {
    day: 7,
    hour: 6,
    minute: 30,
  });
  assert.equal(workflow.steps[0]?.id, 'c31a0000-0014-4000-8000-000000000002');
  assert.equal(validateRecurringTaskGeneratorWorkflow(workflow).valid, true);
});

test('validation rejects a recipe wired to a foreign action', () => {
  const workflow = buildRecurringTaskGeneratorWorkflow({ template });
  const step = workflow.steps[0]!;
  const broken: RecurringTaskGeneratorWorkflow = {
    ...workflow,
    steps: [
      {
        ...step,
        settings: {
          ...step.settings,
          input: {
            logicFunctionId: 'another-action',
            logicFunctionInput: { template },
          },
        },
      },
    ],
  };

  const validation = validateRecurringTaskGeneratorWorkflow(broken);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes('recurring-task-generator'),
    ),
  );
});

test('validation rejects a recipe whose cron schedule is out of range', () => {
  const workflow = buildRecurringTaskGeneratorWorkflow({ template });
  const broken: RecurringTaskGeneratorWorkflow = {
    ...workflow,
    trigger: {
      ...workflow.trigger,
      settings: {
        ...workflow.trigger.settings,
        schedule: { day: 0, hour: 25, minute: 61 },
      },
    },
  };

  const validation = validateRecurringTaskGeneratorWorkflow(broken);

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.length, 3);
});
