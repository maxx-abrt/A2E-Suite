import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_DOCUMENT_PAGE_ICON,
  DOCUMENT_PAGE_ICON_CHOICES,
  resolveDocumentPageIcon,
} from '../document-page-icons.ts';

test('falls back to the default icon when unset or blank', () => {
  assert.equal(resolveDocumentPageIcon(null), DEFAULT_DOCUMENT_PAGE_ICON);
  assert.equal(resolveDocumentPageIcon(undefined), DEFAULT_DOCUMENT_PAGE_ICON);
  assert.equal(resolveDocumentPageIcon('  '), DEFAULT_DOCUMENT_PAGE_ICON);
});

test('accepts an emoji from the dictionary', () => {
  assert.equal(resolveDocumentPageIcon('📌'), '📌');
  assert.equal(resolveDocumentPageIcon('  📚 '), '📚');
});

test('accepts a non-dictionary icon name verbatim for host renderers', () => {
  assert.equal(resolveDocumentPageIcon('IconNotes'), 'IconNotes');
});

test('every dictionary member is a non-empty single token', () => {
  for (const choice of DOCUMENT_PAGE_ICON_CHOICES) {
    assert.equal(choice, choice.trim());
    assert.notEqual(choice, '');
  }
});
