import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildTemplateCopyPayload } from '../instantiate-template.ts';
import {
  STARTER_DOCUMENT_TEMPLATES,
  findMissingStarterTemplates,
} from '../starter-templates.ts';

test('the bundle ships the twenty curated page templates', () => {
  assert.deepEqual(
    STARTER_DOCUMENT_TEMPLATES.map((starterTemplate) => starterTemplate.title),
    [
      'Modèle — Notes de réunion',
      'Modèle — Brief de projet',
      'Modèle — Spécifications produit (PRD)',
      'Modèle — Entretien individuel',
      'Modèle — Journal',
      'Modèle — Revue hebdomadaire',
      'Modèle — Note quotidienne',
      'Modèle — OKR',
      'Modèle — Accueil du wiki d’équipe',
      'Modèle — Guide d’intégration',
      'Modèle — Ordre du jour récurrent',
      'Modèle — Journal de décisions (ADR)',
      'Modèle — Rétrospective',
      'Modèle — Brainstorming',
      'Modèle — Liste de lecture',
      'Modèle — Notes de cours (Cornell)',
      'Modèle — Plan de thèse',
      'Modèle — Recettes de cuisine',
      'Modèle — Plan de voyage',
      'Modèle — CRM personnel',
    ],
  );
});

test('every descriptor title is unique', () => {
  const titles = STARTER_DOCUMENT_TEMPLATES.map(
    (starterTemplate) => starterTemplate.title,
  );

  assert.equal(new Set(titles).size, titles.length);
});

for (const starterTemplate of STARTER_DOCUMENT_TEMPLATES) {
  test(`descriptor « ${starterTemplate.title} » is shaped and instantiable`, () => {
    assert.match(starterTemplate.title, /^Modèle — \S/);
    assert.match(starterTemplate.markdown, /^# /);
    assert.ok(starterTemplate.markdown.trim().length > 20);

    const payload = buildTemplateCopyPayload({
      title: starterTemplate.title,
      content: { blocknote: null, markdown: starterTemplate.markdown },
    });

    assert.equal(
      payload.title,
      starterTemplate.title.slice('Modèle — '.length),
    );
    assert.equal(payload.kind, 'DOCUMENT');
    assert.equal(payload.content.markdown, starterTemplate.markdown);
  });
}

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
      'Modèle — Revue hebdomadaire',
      'Modèle — Note quotidienne',
      'Modèle — OKR',
      'Modèle — Accueil du wiki d’équipe',
      'Modèle — Guide d’intégration',
      'Modèle — Ordre du jour récurrent',
      'Modèle — Journal de décisions (ADR)',
      'Modèle — Rétrospective',
      'Modèle — Brainstorming',
      'Modèle — Liste de lecture',
      'Modèle — Notes de cours (Cornell)',
      'Modèle — Plan de thèse',
      'Modèle — Recettes de cuisine',
      'Modèle — Plan de voyage',
      'Modèle — CRM personnel',
    ],
  );
});

test('nothing is missing when the bundle is fully present', () => {
  const allTitles = STARTER_DOCUMENT_TEMPLATES.map(
    (starterTemplate) => starterTemplate.title,
  );

  assert.deepEqual(findMissingStarterTemplates(allTitles), []);
});
