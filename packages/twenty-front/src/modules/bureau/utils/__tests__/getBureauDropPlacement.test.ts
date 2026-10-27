import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import { getBureauDropPlacement } from '@/bureau/utils/getBureauDropPlacement';

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

const tree = buildBureauTree([
  makeDocument('a', null, 0),
  makeDocument('b', null, 1),
  makeDocument('c', null, 2),
  makeDocument('a1', 'a', 0),
]);

describe('getBureauDropPlacement', () => {
  it('places a page between two siblings', () => {
    expect(
      getBureauDropPlacement({
        draggedId: 'c',
        targetId: 'a',
        zone: 'after',
        tree,
      }),
    ).toEqual({ parentId: null, position: 0.5, siblingRepositions: [] });
  });

  it('nests a page at the end of the target children', () => {
    expect(
      getBureauDropPlacement({
        draggedId: 'b',
        targetId: 'a',
        zone: 'inside',
        tree,
      }),
    ).toEqual({ parentId: 'a', position: 1, siblingRepositions: [] });
  });

  it('refuses to move a page into its own subtree', () => {
    expect(
      getBureauDropPlacement({
        draggedId: 'a',
        targetId: 'a1',
        zone: 'inside',
        tree,
      }),
    ).toBeNull();
  });

  it('renumbers siblings when there is no room between positions', () => {
    const crowdedTree = buildBureauTree([
      makeDocument('x', null, 0),
      makeDocument('y', null, 0),
      makeDocument('z', null, 3),
    ]);

    expect(
      getBureauDropPlacement({
        draggedId: 'z',
        targetId: 'x',
        zone: 'after',
        tree: crowdedTree,
      }),
    ).toEqual({
      parentId: null,
      position: 1,
      siblingRepositions: [{ id: 'y', position: 2 }],
    });
  });
});

it('refuses a stale destination that no longer exists', () => {
  expect(
    getBureauDropPlacement({
      draggedId: 'a',
      targetId: 'deleted',
      zone: 'inside',
      tree,
    }),
  ).toBeNull();
});
