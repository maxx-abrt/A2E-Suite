import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createTreeParentPageState,
  hasNextChildrenPage,
  mergeTreeChildrenPage,
  needsInitialChildrenFetch,
  nestTreeFromChildrenMap,
} from '../document-tree-loading.ts';

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
