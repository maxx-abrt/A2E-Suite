import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDocumentDeepLink } from '../document-deep-link.ts';

test('buildDocumentDeepLink points at the document record page', () => {
  assert.equal(
    buildDocumentDeepLink('c31a0000-0001-4000-8000-000000000000'),
    '/object/document/c31a0000-0001-4000-8000-000000000000',
  );
});

test('buildDocumentDeepLink escapes the record id', () => {
  assert.equal(buildDocumentDeepLink('a/b c'), '/object/document/a%2Fb%20c');
});
