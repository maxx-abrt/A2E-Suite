import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDocumentFavoriteFilter,
  buildDocumentFavoriteKey,
  buildDocumentFavoriteToggle,
  collectFavoriteDocumentIds,
  findDocumentFavorite,
  mapDocumentFavoriteRecords,
  type DocumentFavoriteRecord,
} from '../document-favorites.ts';

const ALICE = 'user-alice';
const BOB = 'user-bob';
const DOC = 'doc-1';

const favorites: DocumentFavoriteRecord[] = [
  { id: 'fav-alice-doc1', userId: ALICE, documentId: DOC },
  { id: 'fav-alice-doc2', userId: ALICE, documentId: 'doc-2' },
  { id: 'fav-bob-doc1', userId: BOB, documentId: DOC },
];

test('a favorite query is scoped to the acting user', () => {
  assert.deepEqual(buildDocumentFavoriteFilter(ALICE), {
    userId: { eq: ALICE },
  });
});

test('the nested document relation maps to a flat record', () => {
  assert.deepEqual(
    mapDocumentFavoriteRecords([
      { id: 'f1', userId: ALICE, document: { id: DOC } },
      { id: 'f2', userId: ALICE, document: null },
      { id: 'f3', userId: null, document: { id: DOC } },
      { id: 'f4', userId: ALICE, document: { id: null } },
    ]),
    [{ id: 'f1', userId: ALICE, documentId: DOC }],
  );
});

test("another member's favorite of the same document is invisible", () => {
  assert.deepEqual([...collectFavoriteDocumentIds(favorites, ALICE)].sort(), [
    'doc-1',
    'doc-2',
  ]);
  assert.deepEqual([...collectFavoriteDocumentIds(favorites, BOB)], [DOC]);
});

test('two members favorite the same document independently', () => {
  const aliceHas = collectFavoriteDocumentIds(favorites, ALICE).has(DOC);
  const bobHas = collectFavoriteDocumentIds(favorites, BOB).has(DOC);

  assert.equal(aliceHas, true);
  assert.equal(bobHas, true);
  assert.equal(findDocumentFavorite(favorites, BOB, DOC)?.id, 'fav-bob-doc1');
});

test('an anonymous session has no favorites and can never write one', () => {
  assert.equal(collectFavoriteDocumentIds(favorites, null).size, 0);
  assert.equal(findDocumentFavorite(favorites, null, DOC), undefined);
  assert.deepEqual(
    buildDocumentFavoriteToggle({
      favorites,
      userId: null,
      documentId: DOC,
    }),
    { action: 'none' },
  );
});

test('toggling an absent favorite creates a row keyed to the member', () => {
  assert.deepEqual(
    buildDocumentFavoriteToggle({
      favorites: [],
      userId: ALICE,
      documentId: DOC,
    }),
    {
      action: 'create',
      data: {
        favoriteKey: `${ALICE}:${DOC}`,
        userId: ALICE,
        documentId: DOC,
      },
    },
  );
});

test('toggling an existing favorite removes that exact row', () => {
  assert.deepEqual(
    buildDocumentFavoriteToggle({
      favorites,
      userId: ALICE,
      documentId: DOC,
    }),
    { action: 'delete', favoriteId: 'fav-alice-doc1' },
  );
});

test('the favorite key is stable per member and distinct across members', () => {
  assert.equal(
    buildDocumentFavoriteKey(ALICE, DOC),
    buildDocumentFavoriteKey(ALICE, DOC),
  );
  assert.notEqual(
    buildDocumentFavoriteKey(ALICE, DOC),
    buildDocumentFavoriteKey(BOB, DOC),
  );
});

test("one member's toggle never touches another member's row", () => {
  const aliceToggle = buildDocumentFavoriteToggle({
    favorites,
    userId: ALICE,
    documentId: 'doc-2',
  });

  assert.deepEqual(aliceToggle, {
    action: 'delete',
    favoriteId: 'fav-alice-doc2',
  });
  assert.equal(findDocumentFavorite(favorites, BOB, DOC)?.id, 'fav-bob-doc1');
});
