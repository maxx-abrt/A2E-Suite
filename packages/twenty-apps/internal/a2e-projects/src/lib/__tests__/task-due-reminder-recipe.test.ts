import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  TASK_DUE_REMINDER_EVENT_MINUTES,
  TASK_DUE_REMINDER_MINUTES,
  TASK_DUE_REMINDER_RECIPE_KEY,
  TASK_DUE_REMINDER_RECIPE_VERSION,
  buildTaskDueReminderRecipePlan,
  deriveTaskDueReminderCorrelationKey,
  deriveTaskDueReminderTitle,
  type TaskDueReminderRecipeInput,
} from '../task-due-reminder-recipe.ts';

// Recette tâche due → rappel Agenda — partie pure : clé de corrélation C5,
// titre, fenêtre du rappel et refus d'une échéance invalide.

const task = {
  id: 'task-1',
  title: 'Livrer le rapport',
  dueAt: '2026-10-01T09:00:00.000Z',
};

const planInput = (
  overrides: Partial<TaskDueReminderRecipeInput> = {},
): TaskDueReminderRecipeInput => ({
  task,
  workspaceId: 'workspace-1',
  ...overrides,
});

test('the correlation key is deterministic for a replayed trigger', () => {
  const first = deriveTaskDueReminderCorrelationKey({
    sourceRecordId: 'task-1',
    workspaceId: 'workspace-1',
  });

  assert.equal(
    first,
    `${TASK_DUE_REMINDER_RECIPE_KEY}@v${TASK_DUE_REMINDER_RECIPE_VERSION}:workspace-1:task:task-1`,
  );
  assert.equal(
    first,
    deriveTaskDueReminderCorrelationKey({
      sourceRecordId: 'task-1',
      workspaceId: 'workspace-1',
    }),
  );
});

test('the reminder title carries the task title, with a fallback', () => {
  assert.equal(
    deriveTaskDueReminderTitle('Livrer le rapport'),
    'Rappel – Livrer le rapport',
  );
  assert.equal(deriveTaskDueReminderTitle('  '), 'Rappel – Tâche à échéance');
  assert.equal(deriveTaskDueReminderTitle(undefined), 'Rappel – Tâche à échéance');
});

test('the plan writes one native calendar reminder at the due date', () => {
  const plan = buildTaskDueReminderRecipePlan(planInput());

  assert.equal(plan.steps.length, 1);
  assert.deepEqual(plan.steps[0], {
    kind: 'CREATE_REMINDER',
    correlationKey: plan.correlationKey,
    writes: {
      object: 'calendarEvent',
      title: 'Rappel – Livrer le rapport',
      startsAt: '2026-10-01T09:00:00.000Z',
      endsAt: '2026-10-01T09:30:00.000Z',
      reminderMinutes: TASK_DUE_REMINDER_MINUTES,
      iCalUid: plan.correlationKey,
    },
  });
  assert.equal(TASK_DUE_REMINDER_EVENT_MINUTES, 30);
});

test('an invalid or missing due date is rejected, never silently planned', () => {
  assert.throws(() =>
    buildTaskDueReminderRecipePlan(
      planInput({ task: { ...task, dueAt: 'not-a-date' } }),
    ),
  );
  assert.throws(() =>
    buildTaskDueReminderRecipePlan(
      planInput({ task: { ...task, dueAt: null } }),
    ),
  );
});
