import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDocumentChromeUpdatePayload,
  DEFAULT_DOCUMENT_COVER_COLOR,
  DOCUMENT_COVER_COLOR_CHOICES,
  readDocumentChromePreferences,
  resolveDocumentCover,
} from '../document-chrome.ts';

test('reads preferences with inert defaults for unset fields', () => {
  assert.deepEqual(readDocumentChromePreferences({}), {
    icon: null,
    coverColor: null,
    coverImage: null,
    isFullWidth: false,
    isSmallText: false,
    isLocked: false,
  });
});

test('trims text fields and treats blank as absent', () => {
  assert.deepEqual(
    readDocumentChromePreferences({
      icon: '  📌 ',
      coverColor: '   ',
      isFullWidth: true,
    }),
    {
      icon: '📌',
      coverColor: null,
      coverImage: null,
      isFullWidth: true,
      isSmallText: false,
      isLocked: false,
    },
  );
});

test('writes only the keys the caller set', () => {
  assert.deepEqual(
    buildDocumentChromeUpdatePayload({ isFullWidth: true, isLocked: false }),
    { isFullWidth: true, isLocked: false },
  );
});

test('an empty string clears a nullable text field to null', () => {
  assert.deepEqual(buildDocumentChromeUpdatePayload({ coverImage: '  ' }), {
    coverImage: null,
  });
});

test('an undefined patch key is never written', () => {
  assert.deepEqual(buildDocumentChromeUpdatePayload({ icon: '📄' }), {
    icon: '📄',
  });
});

test('prefers a real cover image over the flat color fallback', () => {
  assert.deepEqual(
    resolveDocumentCover({ coverImage: ' https://cdn/x.png ', coverColor: '#111' }),
    { kind: 'image', source: 'https://cdn/x.png' },
  );
});

test('ignores a non-image cover value and falls back to the color', () => {
  assert.deepEqual(resolveDocumentCover({ coverImage: 'oops', coverColor: '#111' }), {
    kind: 'color',
    color: '#111',
  });
});

test('reports no cover when neither field is set', () => {
  assert.deepEqual(resolveDocumentCover({}), { kind: 'none' });
});

test('exposes a theme-safe palette with a defaults member', () => {
  assert.ok(
    (DOCUMENT_COVER_COLOR_CHOICES as readonly string[]).includes(
      DEFAULT_DOCUMENT_COVER_COLOR,
    ),
  );
});
