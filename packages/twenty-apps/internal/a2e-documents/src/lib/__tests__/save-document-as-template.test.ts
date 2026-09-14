import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildSaveAsTemplatePayload,
  buildSaveAsTemplateTitle,
  buildTemplateDuplicatePayload,
  buildTemplateDuplicateTitle,
} from '../save-document-as-template.ts';
import { DEFAULT_TEMPLATE_COPY_POSITION } from '../instantiate-template.ts';

test('the save-as-template title adds the template prefix', () => {
  assert.equal(
    buildSaveAsTemplateTitle('Rapport annuel'),
    'Modèle — Rapport annuel',
  );
});

test('an already-prefixed title is not double-prefixed', () => {
  assert.equal(
    buildSaveAsTemplateTitle('Modèle — Notes de réunion'),
    'Modèle — Notes de réunion',
  );
});

test('an empty title falls back to the default template title', () => {
  assert.equal(
    buildSaveAsTemplateTitle(''),
    'Modèle — Nouveau document',
  );
  assert.equal(
    buildSaveAsTemplateTitle('   '),
    'Modèle — Nouveau document',
  );
});

test('the save payload promotes to TEMPLATE with content verbatim', () => {
  const payload = buildSaveAsTemplatePayload({
    title: 'Rapport annuel',
    content: {
      blocknote: '{"blocks":[]}',
      markdown: '# Rapport annuel',
    },
  });

  assert.deepEqual(payload, {
    title: 'Modèle — Rapport annuel',
    kind: 'TEMPLATE',
    position: DEFAULT_TEMPLATE_COPY_POSITION,
    content: {
      blocknote: '{"blocks":[]}',
      markdown: '# Rapport annuel',
    },
  });
});

test('the save payload tolerates a document without content', () => {
  const payload = buildSaveAsTemplatePayload({ title: 'Vierge' });

  assert.deepEqual(payload.content, {
    blocknote: null,
    markdown: null,
  });
});

test('the caller can override the insertion position', () => {
  const payload = buildSaveAsTemplatePayload(
    { title: 'Rapport annuel' },
    { position: 'a0' },
  );

  assert.equal(payload.position, 'a0');
});

test('the duplicate title keeps the prefix and marks the copy', () => {
  assert.equal(
    buildTemplateDuplicateTitle('Modèle — Notes de réunion'),
    'Modèle — Notes de réunion (copie)',
  );
  assert.equal(
    buildTemplateDuplicateTitle('Notes de réunion'),
    'Modèle — Notes de réunion (copie)',
  );
});

test('the duplicate payload stays a TEMPLATE with content verbatim', () => {
  const payload = buildTemplateDuplicatePayload({
    title: 'Modèle — Brief de projet',
    content: {
      blocknote: '{"blocks":[]}',
      markdown: '# Brief de projet',
    },
  });

  assert.deepEqual(payload, {
    title: 'Modèle — Brief de projet (copie)',
    kind: 'TEMPLATE',
    position: DEFAULT_TEMPLATE_COPY_POSITION,
    content: {
      blocknote: '{"blocks":[]}',
      markdown: '# Brief de projet',
    },
  });
});
