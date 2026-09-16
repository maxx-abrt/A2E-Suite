import assert from 'node:assert/strict';
import { test } from 'node:test';

import { collectGalleryTemplates } from '../template-gallery.ts';
import { DOCUMENT_KIND } from '../../constants/field-vocabulary.ts';

test('the gallery keeps only TEMPLATE records', () => {
  const templates = collectGalleryTemplates([
    { id: '1', title: 'Modèle — Notes', kind: DOCUMENT_KIND.TEMPLATE, archivedAt: null },
    { id: '2', title: 'Compte rendu', kind: DOCUMENT_KIND.DOCUMENT, archivedAt: null },
  ]);

  assert.deepEqual(
    templates.map((template) => template.id),
    ['1'],
  );
});

test('archived templates stay out of the gallery', () => {
  const templates = collectGalleryTemplates([
    { id: '1', title: 'Modèle — actif', kind: DOCUMENT_KIND.TEMPLATE, archivedAt: null },
    {
      id: '2',
      title: 'Modèle — archivé',
      kind: DOCUMENT_KIND.TEMPLATE,
      archivedAt: '2026-01-01T00:00:00.000Z',
    },
  ]);

  assert.deepEqual(
    templates.map((template) => template.id),
    ['1'],
  );
});

test('gallery titles sort with the French locale', () => {
  const templates = collectGalleryTemplates([
    { id: '1', title: 'Modèle — Étude', kind: DOCUMENT_KIND.TEMPLATE, archivedAt: null },
    { id: '2', title: 'Modèle — Brief', kind: DOCUMENT_KIND.TEMPLATE, archivedAt: null },
    { id: '3', title: 'Modèle — á viser', kind: DOCUMENT_KIND.TEMPLATE, archivedAt: null },
  ]);

  assert.deepEqual(
    templates.map((template) => template.title),
    ['Modèle — á viser', 'Modèle — Brief', 'Modèle — Étude'],
  );
});

test('an empty input yields an empty gallery', () => {
  assert.deepEqual(collectGalleryTemplates([]), []);
});
