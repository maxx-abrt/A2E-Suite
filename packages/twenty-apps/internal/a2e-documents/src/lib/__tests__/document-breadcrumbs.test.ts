import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildBreadcrumbTrail,
  type DocumentBreadcrumbNode,
} from '../document-breadcrumbs.ts';

const node = (
  id: string,
  title: string,
  parentId: string | null,
): DocumentBreadcrumbNode => ({ id, title, parentId });

test('orders the trail root-first and ends on the current page', () => {
  const ancestorsById = new Map([
    ['root', node('root', 'Racine', null)],
    ['parent', node('parent', 'Parent', 'root')],
  ]);

  assert.deepEqual(
    buildBreadcrumbTrail({
      current: node('current', 'Page', 'parent'),
      ancestorsById,
    }),
    [
      node('root', 'Racine', null),
      node('parent', 'Parent', 'root'),
      node('current', 'Page', 'parent'),
    ],
  );
});

test('returns only the current page at the tree root', () => {
  assert.deepEqual(
    buildBreadcrumbTrail({
      current: node('current', 'Page', null),
      ancestorsById: new Map(),
    }),
    [node('current', 'Page', null)],
  );
});

test('truncates at a missing (unreadable) ancestor', () => {
  const ancestorsById = new Map([
    ['parent', node('parent', 'Parent', 'missing-grandparent')],
  ]);

  assert.deepEqual(
    buildBreadcrumbTrail({
      current: node('current', 'Page', 'parent'),
      ancestorsById,
    }),
    [
      node('parent', 'Parent', 'missing-grandparent'),
      node('current', 'Page', 'parent'),
    ],
  );
});

test('stops on a cycle instead of looping forever', () => {
  const ancestorsById = new Map([
    ['a', node('a', 'A', 'b')],
    ['b', node('b', 'B', 'a')],
  ]);

  const trail = buildBreadcrumbTrail({
    current: node('current', 'Page', 'a'),
    ancestorsById,
  });

  assert.deepEqual(
    trail.map((entry) => entry.id),
    ['b', 'a', 'current'],
  );
});
