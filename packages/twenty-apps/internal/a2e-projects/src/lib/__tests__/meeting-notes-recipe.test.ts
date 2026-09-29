import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MEETING_NOTES_RECIPE_KEY,
  MEETING_NOTES_RECIPE_VERSION,
  buildMeetingNotesRecipePlan,
  deriveMeetingNotesCorrelationKey,
  deriveMeetingNotesDocumentTitle,
  type MeetingNotesRecipeInput,
} from '../meeting-notes-recipe.ts';

// Recette réunion → page de notes — partie pure : clé de corrélation C5,
// dérivation du titre et plan d'écritures. Aucune horloge ni client n'entre
// ici : le plan doit être reproductible pour être prévisualisable.

const event = { id: 'event-1', title: 'Point hebdo' };

const planInput = (
  overrides: Partial<MeetingNotesRecipeInput> = {},
): MeetingNotesRecipeInput => ({
  event,
  workspaceId: 'workspace-1',
  ...overrides,
});

test('the correlation key is deterministic for a replayed trigger', () => {
  const first = deriveMeetingNotesCorrelationKey({
    sourceRecordId: 'event-1',
    workspaceId: 'workspace-1',
  });
  const replay = deriveMeetingNotesCorrelationKey({
    sourceRecordId: 'event-1',
    workspaceId: 'workspace-1',
  });

  assert.equal(first, replay);
  assert.equal(
    first,
    `${MEETING_NOTES_RECIPE_KEY}@v${MEETING_NOTES_RECIPE_VERSION}:workspace-1:calendarEvent:event-1`,
  );
  assert.notEqual(
    first,
    deriveMeetingNotesCorrelationKey({
      sourceRecordId: 'event-2',
      workspaceId: 'workspace-1',
    }),
  );
});

test('the document title carries the meeting title, with a fallback', () => {
  assert.equal(
    deriveMeetingNotesDocumentTitle('Point hebdo'),
    'Notes de réunion – Point hebdo',
  );
  assert.equal(deriveMeetingNotesDocumentTitle('   '), 'Notes de réunion');
  assert.equal(deriveMeetingNotesDocumentTitle(null), 'Notes de réunion');
});

test('the plan writes one Bureau notes page tagged with its provenance', () => {
  const plan = buildMeetingNotesRecipePlan(planInput());

  assert.equal(plan.steps.length, 1);
  assert.deepEqual(plan.steps[0], {
    kind: 'CREATE_DOCUMENT',
    correlationKey: plan.correlationKey,
    writes: {
      object: 'document',
      title: 'Notes de réunion – Point hebdo',
      kind: 'DOCUMENT',
      recipeCorrelationKey: plan.correlationKey,
    },
  });
});

test('a plan never writes an invoice or accounting leg (P7 blocked)', () => {
  const plan = buildMeetingNotesRecipePlan(planInput());
  const serialized = JSON.stringify(plan).toLowerCase();

  assert.ok(!serialized.includes('invoice'));
  assert.ok(!serialized.includes('accounting'));
});
