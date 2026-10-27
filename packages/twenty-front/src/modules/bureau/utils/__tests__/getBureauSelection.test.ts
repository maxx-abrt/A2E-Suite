import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import {
  getBureauSelectionRoots,
  getBureauVisiblePageIds,
  toggleBureauSelection,
} from '@/bureau/utils/getBureauSelection';

const page = (
  id: string,
  parentId: string | null,
  position: number,
): BureauDocument => ({
  __typename: 'Document',
  id,
  title: id,
  parentId,
  position,
  icon: null,
  coverColor: null,
  coverImage: null,
  createdAt: null,
  updatedAt: null,
  deletedAt: null,
});
const tree = buildBureauTree([
  page('a', null, 0),
  page('child', 'a', 0),
  page('deep', 'child', 0),
  page('b', null, 1),
  page('c', null, 2),
]);

it('processes selected subtrees once in tree order, excluding stale IDs', () => {
  expect(
    getBureauSelectionRoots(['c', 'deep', 'a', 'child', 'gone', 'a'], tree),
  ).toEqual(['a', 'c']);
});
it('ranges over expanded pages and excludes hidden descendants', () => {
  const visibleIds = getBureauVisiblePageIds(tree, ['a']);
  expect(visibleIds).toEqual(['a', 'child', 'b', 'c']);
  expect(
    toggleBureauSelection({
      selectedIds: ['child'],
      pageId: 'c',
      anchorId: 'child',
      visibleIds,
      extend: true,
    }),
  ).toEqual(['child', 'b', 'c']);
});
it('supports reverse ranges and toggles without an anchor', () => {
  expect(
    toggleBureauSelection({
      selectedIds: [],
      pageId: 'a',
      anchorId: 'b',
      visibleIds: ['a', 'b', 'c'],
      extend: true,
    }),
  ).toEqual(['a', 'b']);
  expect(
    toggleBureauSelection({
      selectedIds: ['a'],
      pageId: 'a',
      anchorId: null,
      visibleIds: ['a'],
      extend: true,
    }),
  ).toEqual([]);
});

it('keeps saved template branches out of the page range and default select-all', () => {
  const withTemplate = buildBureauTree([
    ...tree.documentsById.values(),
    { ...page('template', null, 1), kind: 'TEMPLATE' },
    page('template-child', 'template', 0),
  ]);
  expect(
    getBureauVisiblePageIds(
      withTemplate,
      [...withTemplate.documentsById.keys()],
      false,
    ),
  ).toEqual(['a', 'child', 'deep', 'b', 'c']);
  expect(
    getBureauSelectionRoots(['template', 'template-child'], withTemplate),
  ).toEqual(['template']);
});
