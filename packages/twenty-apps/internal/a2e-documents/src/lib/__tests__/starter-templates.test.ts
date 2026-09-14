import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  STARTER_DOCUMENT_TEMPLATES,
  findMissingStarterTemplates,
} from '../starter-templates.ts';

test('the bundle ships the four starter templates', () => {
  assert.deepEqual(
    STARTER_DOCUMENT_TEMPLATES.map((starterTemplate) => starterTemplate.title),
    [
      'Modèle — Notes de réunion',
      'Modèle — Brief de projet',
      'Modèle — Spécifications produit (PRD)',
      'Modèle — Entretien individuel',
    ],
  );
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
    ],
  );
});

test('nothing is missing when the bundle is fully present', () => {
  const allTitles = STARTER_DOCUMENT_TEMPLATES.map(
    (starterTemplate) => starterTemplate.title,
  );

  assert.deepEqual(findMissingStarterTemplates(allTitles), []);
});
