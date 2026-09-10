import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_TEMPLATE_COPY_POSITION,
  buildTemplateCopyPayload,
  buildTemplateCopyTitle,
} from '../instantiate-template.ts';

test('the copy strips the template title prefix', () => {
  assert.equal(
    buildTemplateCopyTitle('Modèle — Notes de réunion'),
    'Notes de réunion',
  );
});

test('a plain title is used as-is', () => {
  assert.equal(buildTemplateCopyTitle('SOP Support'), 'SOP Support');
});

test('an empty title falls back to the default document title', () => {
  assert.equal(buildTemplateCopyTitle('Modèle — '), 'Nouveau document');
  assert.equal(buildTemplateCopyTitle(''), 'Nouveau document');
});

test('the payload copies content verbatim and demotes to DOCUMENT', () => {
  const payload = buildTemplateCopyPayload({
    id: 'template-1',
    title: 'Modèle — Notes de réunion',
    content: {
      blocknote: '{"blocks":[]}',
      markdown: '# Notes de réunion',
    },
  });

  assert.deepEqual(payload, {
    title: 'Notes de réunion',
    kind: 'DOCUMENT',
    position: DEFAULT_TEMPLATE_COPY_POSITION,
    content: {
      blocknote: '{"blocks":[]}',
      markdown: '# Notes de réunion',
    },
  });
});

test('the payload tolerates a template without content', () => {
  const payload = buildTemplateCopyPayload({
    id: 'template-2',
    title: 'Modèle — Vierge',
  });

  assert.deepEqual(payload.content, {
    blocknote: null,
    markdown: null,
  });
});

test('the caller can override the insertion position', () => {
  const payload = buildTemplateCopyPayload(
    { id: 'template-3', title: 'Modèle — X' },
    { position: 'a0' },
  );

  assert.equal(payload.position, 'a0');
});
