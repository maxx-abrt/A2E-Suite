import { type BureauDropPlacement } from '@/bureau/types/BureauDropPlacement';
import { type BureauDropZone } from '@/bureau/types/BureauDropZone';
import { type BureauTree } from '@/bureau/types/BureauTree';
import { getBureauAppendPosition } from '@/bureau/utils/getBureauAppendPosition';
import { getBureauDescendantIds } from '@/bureau/utils/getBureauDescendantIds';
import { getBureauPositionBetween } from '@/bureau/utils/getBureauPositionBetween';
import { isDefined } from 'twenty-shared/utils';

// Resolves a drop of `draggedId` relative to `targetId` (or onto the root when
// `targetId` is null). Returns null for an impossible move: onto itself or
// into its own subtree.
export const getBureauDropPlacement = ({
  draggedId,
  targetId,
  zone,
  tree,
}: {
  draggedId: string;
  targetId: string | null;
  zone: BureauDropZone;
  tree: BureauTree;
}): BureauDropPlacement | null => {
  if (
    draggedId === targetId ||
    !tree.documentsById.has(draggedId) ||
    (isDefined(targetId) && !tree.documentsById.has(targetId))
  ) {
    return null;
  }

  if (
    isDefined(targetId) &&
    getBureauDescendantIds(draggedId, tree.childrenByParentId).includes(
      targetId,
    )
  ) {
    return null;
  }

  const parentId =
    !isDefined(targetId) || zone === 'inside'
      ? targetId
      : (tree.parentIdById.get(targetId) ?? null);

  const siblings = (tree.childrenByParentId.get(parentId) ?? []).filter(
    (sibling) => sibling.id !== draggedId,
  );

  if (!isDefined(targetId) || zone === 'inside') {
    return {
      parentId,
      position: getBureauAppendPosition(siblings),
      siblingRepositions: [],
    };
  }

  const targetIndex = siblings.findIndex((sibling) => sibling.id === targetId);

  if (targetIndex === -1) {
    return null;
  }

  const insertIndex = zone === 'after' ? targetIndex + 1 : targetIndex;
  const position = getBureauPositionBetween(
    siblings[insertIndex - 1]?.position ?? undefined,
    siblings[insertIndex]?.position ?? undefined,
  );

  if (isDefined(position)) {
    return { parentId, position, siblingRepositions: [] };
  }

  // No room between the neighbours: renumber the siblings once, in order.
  const siblingRepositions = siblings
    .map((sibling, index) => ({
      id: sibling.id,
      currentPosition: sibling.position,
      position: index < insertIndex ? index : index + 1,
    }))
    .filter((sibling) => sibling.currentPosition !== sibling.position)
    .map(({ id, position: nextPosition }) => ({ id, position: nextPosition }));

  return { parentId, position: insertIndex, siblingRepositions };
};
