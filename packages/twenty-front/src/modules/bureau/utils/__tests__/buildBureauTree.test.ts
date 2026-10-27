import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import { getBureauAncestors } from '@/bureau/utils/getBureauAncestors';
import { getBureauDescendantIds } from '@/bureau/utils/getBureauDescendantIds';

const makeDocument = (
  id: string,
  parentId: string | null,
  position: number,
): BureauDocument => ({
  __typename: 'Document',
  id,
  parentId,
  position,
  title: id,
  icon: null,
  coverColor: null,
  coverImage: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
});

describe('buildBureauTree', () => {
  it('nests children under their parent, sorted by position', () => {
    const tree = buildBureauTree([
      makeDocument('b', null, 2),
      makeDocument('a', null, 1),
      makeDocument('a2', 'a', 5),
      makeDocument('a1', 'a', 1),
    ]);

    expect(tree.childrenByParentId.get(null)?.map(({ id }) => id)).toEqual([
      'a',
      'b',
    ]);
    expect(tree.childrenByParentId.get('a')?.map(({ id }) => id)).toEqual([
      'a1',
      'a2',
    ]);
  });

  it('keeps optimistic pages with null timestamps stable while server fields arrive', () => {
    const first = {
      ...makeDocument('a', null, 0),
      createdAt: null,
      updatedAt: null,
    };
    const second = {
      ...makeDocument('b', null, 0),
      createdAt: null,
      updatedAt: null,
    };
    const tree = buildBureauTree([
      second,
      first,
      makeDocument('saved', null, 0),
    ]);
    expect(tree.childrenByParentId.get(null)?.map(({ id }) => id)).toEqual([
      'a',
      'b',
      'saved',
    ]);
  });

  it('attaches orphans and cycles to the root', () => {
    const tree = buildBureauTree([
      makeDocument('orphan', 'missing', 0),
      makeDocument('x', 'y', 0),
      makeDocument('y', 'x', 1),
    ]);

    expect(
      tree.childrenByParentId
        .get(null)
        ?.map(({ id }) => id)
        .sort(),
    ).toEqual(['orphan', 'x', 'y']);
  });

  it('resolves ancestors and descendants', () => {
    const tree = buildBureauTree([
      makeDocument('root', null, 0),
      makeDocument('child', 'root', 0),
      makeDocument('leaf', 'child', 0),
    ]);

    expect(getBureauAncestors('leaf', tree).map(({ id }) => id)).toEqual([
      'root',
      'child',
    ]);
    expect(getBureauDescendantIds('root', tree.childrenByParentId)).toEqual([
      'child',
      'leaf',
    ]);
  });
});
