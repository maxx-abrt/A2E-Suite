import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildTemplateCopyPayload } from '../instantiate-template.ts';
import {
  STARTER_DOCUMENT_TEMPLATES,
  findMissingStarterTemplates,
} from '../starter-templates.ts';

test('the bundle ships the five starter templates', () => {
  assert.deepEqual(
    STARTER_DOCUMENT_TEMPLATES.map((starterTemplate) => starterTemplate.title),
    [
      'Modèle — Notes de réunion',
      'Modèle — Brief de projet',
      'Modèle — Spécifications produit (PRD)',
      'Modèle — Entretien individuel',
      'Modèle — Journal',
    ],
  );
});

test('the journal template instantiates through the existing payload builder', () => {
  const journalTemplate = STARTER_DOCUMENT_TEMPLATES.find(
    (starterTemplate) => starterTemplate.title === 'Modèle — Journal',
  );

  assert.ok(journalTemplate, 'the journal template must ship in the bundle');

  const payload = buildTemplateCopyPayload({
    title: journalTemplate.title,
    content: { blocknote: null, markdown: journalTemplate.markdown },
  });

  assert.equal(payload.title, 'Journal');
  assert.equal(payload.kind, 'DOCUMENT');
  assert.equal(payload.content.markdown, journalTemplate.markdown);
});

test('re-instantiating a journal copy never doubles the title prefix', () => {
  const firstCopy = buildTemplateCopyPayload({ title: 'Modèle — Journal' });
  const secondCopy = buildTemplateCopyPayload({ title: firstCopy.title });

  assert.equal(firstCopy.title, 'Journal');
  assert.equal(secondCopy.title, 'Journal');
});

test('every starter template carries non-empty markdown content', () => {
  for (const starterTemplate of STARTER_DOCUMENT_TEMPLATES) {
    assert.match(starterTemplate.markdown, /^# /);
    assert.ok(starterTemplate.markdown.length > 20);
  }
});

test('only missing titles are returned as the install delta', () => {
  const missing = findMissingStarterTemplates([
    'Modèle — Notes de réunion',
    'Un autre modèle ajouté par l’utilisateur',
  ]);

  assert.deepEqual(
    missing.map((starterTemplate) => starterTemplate.title),
    [
      'Modèle — Brief de projet',
      'Modèle — Spécifications produit (PRD)',
      'Modèle — Entretien individuel',
      'Modèle — Journal',
    ],
  );
});

test('nothing is missing when the bundle is fully present', () => {
  const allTitles = STARTER_DOCUMENT_TEMPLATES.map(
    (starterTemplate) => starterTemplate.title,
  );

  assert.deepEqual(findMissingStarterTemplates(allTitles), []);
});
