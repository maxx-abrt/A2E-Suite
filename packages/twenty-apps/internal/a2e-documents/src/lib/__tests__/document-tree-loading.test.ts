import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createTreeParentPageState,
  hasNextChildrenPage,
  mergeTreeChildrenPage,
  needsInitialChildrenFetch,
  nestTreeFromChildrenMap,
  TREE_CHILDREN_PAGE_SIZE,
} from '../document-tree-loading.ts';
import { buildAppendPosition } from '../fractional-position.ts';

test('an unseen parent needs its first page and has no more-pages flag', () => {
  assert.equal(needsInitialChildrenFetch(undefined), true);
  assert.equal(hasNextChildrenPage(undefined), false);
});

test('a freshly created page state is unloaded and conservatively has more', () => {
  const state = createTreeParentPageState();

  assert.equal(needsInitialChildrenFetch(state), true);
  assert.equal(hasNextChildrenPage(state), false);
});

test('a loaded page without a next page does not need a fetch nor show more', () => {
  const state = { isLoaded: true, endCursor: null, hasNextPage: false };

  assert.equal(needsInitialChildrenFetch(state), false);
  assert.equal(hasNextChildrenPage(state), false);
});

test('a loaded page with a next page shows more but does not refetch', () => {
  const state = { isLoaded: true, endCursor: 'cursor-1', hasNextPage: true };

  assert.equal(needsInitialChildrenFetch(state), false);
  assert.equal(hasNextChildrenPage(state), true);
});

test('merging a page appends new nodes after the already loaded ones', () => {
  const merged = mergeTreeChildrenPage(
    [{ id: 'a' }, { id: 'b' }],
    [{ id: 'c' }, { id: 'd' }],
  );

  assert.deepEqual(
    merged.map((node) => node.id),
    ['a', 'b', 'c', 'd'],
  );
});

test('merging a page never duplicates a node already held in memory', () => {
  const merged = mergeTreeChildrenPage(
    [{ id: 'a' }, { id: 'b' }],
    [{ id: 'b' }, { id: 'c' }],
  );

  assert.deepEqual(
    merged.map((node) => node.id),
    ['a', 'b', 'c'],
  );
});

test('merging a page keeps the server order of the new rows', () => {
  const merged = mergeTreeChildrenPage(
    [],
    [{ id: 'c' }, { id: 'a' }, { id: 'b' }],
  );

  assert.deepEqual(
    merged.map((node) => node.id),
    ['c', 'a', 'b'],
  );
});

test('the nested rebuild follows the per-parent pages at every depth', () => {
  const childrenByParentId = new Map<string | null, { id: string }[]>([
    [null, [{ id: 'a' }, { id: 'b' }]],
    ['a', [{ id: 'a1' }]],
    ['a1', [{ id: 'a1x' }]],
    ['b', [{ id: 'b1' }]],
  ]);

  const nested = nestTreeFromChildrenMap(childrenByParentId);

  assert.deepEqual(
    nested.map((node) => node.id),
    ['a', 'b'],
  );
  assert.deepEqual(
    nested[0].children?.edges.map((edge) => edge.node.id),
    ['a1'],
  );
  assert.deepEqual(
    nested[0].children?.edges[0].node.children?.edges.map(
      (edge) => edge.node.id,
    ),
    ['a1x'],
  );
  assert.deepEqual(
    nested[1].children?.edges.map((edge) => edge.node.id),
    ['b1'],
  );
});

test('the nested rebuild drops a node reachable from two parents', () => {
  // A corrupt page could expose the same id under two parents; the visited
  // guard must yield it once instead of duplicating or looping forever.
  const childrenByParentId = new Map<string | null, { id: string }[]>([
    [null, [{ id: 'root' }]],
    ['root', [{ id: 'shared' }, { id: 'shared' }]],
  ]);

  const nested = nestTreeFromChildrenMap(childrenByParentId);

  assert.deepEqual(
    nested[0].children?.edges.map((edge) => edge.node.id),
    ['shared'],
  );
});

test('the nested rebuild tolerates a self-referencing page', () => {
  const childrenByParentId = new Map<string | null, { id: string }[]>([
    [null, [{ id: 'loop' }]],
    ['loop', [{ id: 'loop' }]],
  ]);

  const nested = nestTreeFromChildrenMap(childrenByParentId);

  assert.deepEqual(
    nested.map((node) => node.id),
    ['loop'],
  );
  assert.equal(nested[0].children, undefined);
});

test('expanding a node fetches its first page, then load-more pages the same parent', () => {
  // Expand: an unseen parent needs exactly one initial fetch and shows no
  // "Charger plus" until that page reports a next cursor.
  assert.equal(needsInitialChildrenFetch(undefined), true);

  const firstPageState = {
    isLoaded: true,
    endCursor: 'cursor-1',
    hasNextPage: true,
  };

  // A second expand must not refetch; the page just offers the next cursor.
  assert.equal(needsInitialChildrenFetch(firstPageState), false);
  assert.equal(hasNextChildrenPage(firstPageState), true);

  const lastPageState = {
    isLoaded: true,
    endCursor: 'cursor-2',
    hasNextPage: false,
  };

  assert.equal(needsInitialChildrenFetch(lastPageState), false);
  assert.equal(hasNextChildrenPage(lastPageState), false);
});

test('more than one API page of siblings stays in fractional-index order', () => {
  // The browser writes each append with a position greater than the previous
  // sibling, which is the order the server returns keys in. Loading three
  // cursor pages must therefore reproduce the position sort exactly, with no
  // reorder across the page boundaries.
  const siblingCount = TREE_CHILDREN_PAGE_SIZE * 2 + 3;
  const positions: string[] = [];

  for (let index = 0; index < siblingCount; index++) {
    positions.push(buildAppendPosition(positions[positions.length - 1]));
  }

  const orderedNodes = positions.map((position, index) => ({
    id: `doc-${index}`,
    position,
  }));

  const pages = [
    orderedNodes.slice(0, TREE_CHILDREN_PAGE_SIZE),
    orderedNodes.slice(TREE_CHILDREN_PAGE_SIZE, TREE_CHILDREN_PAGE_SIZE * 2),
    orderedNodes.slice(TREE_CHILDREN_PAGE_SIZE * 2),
  ];

  const merged = pages.reduce(
    (loaded, page) => mergeTreeChildrenPage(loaded, page),
    [] as { id: string; position: string }[],
  );

  assert.deepEqual(
    merged.map((node) => node.id),
    orderedNodes.map((node) => node.id),
  );
  assert.deepEqual(
    merged.map((node) => node.position),
    [...merged]
      .sort((left, right) => (left.position < right.position ? -1 : 1))
      .map((node) => node.position),
  );
});
