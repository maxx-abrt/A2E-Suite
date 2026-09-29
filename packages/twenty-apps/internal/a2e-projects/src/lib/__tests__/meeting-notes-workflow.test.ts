import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import logicFunctionDefinition from '../../logic-functions/meeting-notes-page.logic-function.ts';
import {
  MEETING_NOTES_STEP_ID,
  buildMeetingNotesWorkflow,
  validateMeetingNotesWorkflow,
  type MeetingNotesWorkflow,
} from '../../workflow-templates/meeting-notes.workflow.ts';

// Deux côtés du même contrat : la recette est construite avec le vocabulaire
// déclencheur/action du moteur de workflow, et l'étape pointe sur une action que
// l'app déclare au manifeste (`dev:build` l'enregistre comme étape).

test('the page action ships as a manifest-declared workflow step', () => {
  assert.equal(
    logicFunctionDefinition.success,
    true,
    logicFunctionDefinition.errors.join(', '),
  );
  assert.equal(
    logicFunctionDefinition.config.universalIdentifier,
    LOGIC_FUNCTION_IDS.meetingNotesPage,
  );
  assert.equal(
    logicFunctionDefinition.config.workflowActionTriggerSettings?.label,
    'Créer la page de notes',
  );
});

test('the trigger is the native calendar-event creation, one logic-function step', () => {
  const workflow = buildMeetingNotesWorkflow();
  const { trigger, steps } = workflow;

  assert.equal(trigger.type, 'DATABASE_EVENT');
  assert.equal(trigger.settings.eventName, 'calendarEvent.created');
  assert.equal(trigger.settings.objectType, 'calendarEvent');
  assert.deepEqual(trigger.nextStepIds, [MEETING_NOTES_STEP_ID]);
  assert.deepEqual(trigger.settings.filter, {
    stepFilterGroups: [],
    stepFilters: [],
  });

  assert.equal(steps.length, 1);
  assert.equal(steps[0]?.id, MEETING_NOTES_STEP_ID);
  assert.equal(steps[0]?.type, 'LOGIC_FUNCTION');
  assert.equal(
    steps[0]?.settings.input.logicFunctionId,
    LOGIC_FUNCTION_IDS.meetingNotesPage,
  );
  assert.deepEqual(steps[0]?.settings.input.logicFunctionInput, {
    eventId: '{{trigger.properties.after.id}}',
    eventTitle: '{{trigger.properties.after.title}}',
  });

  assert.deepEqual(validateMeetingNotesWorkflow(workflow), {
    valid: true,
    errors: [],
  });
});

test('the descriptor is opt-in: no activation state is carried', () => {
  const workflow = buildMeetingNotesWorkflow() as MeetingNotesWorkflow & {
    status?: unknown;
    isActive?: unknown;
  };

  assert.equal('status' in workflow, false);
  assert.equal('isActive' in workflow, false);
});

test('validation rejects a foreign action and an invoice step', () => {
  const workflow = buildMeetingNotesWorkflow();
  const step = workflow.steps[0]!;

  const foreign: MeetingNotesWorkflow = {
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

  assert.equal(validateMeetingNotesWorkflow(foreign).valid, false);

  const invoiced: MeetingNotesWorkflow = {
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

  assert.equal(validateMeetingNotesWorkflow(invoiced).valid, false);
});
