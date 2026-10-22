// Where a dragged page lands. `siblingRepositions` is only filled when the
// target gap has no room left between two positions (equal or inverted
// neighbours): the siblings are then renumbered once, in order.
export type BureauDropPlacement = {
  parentId: string | null;
  position: number;
  siblingRepositions: { id: string; position: number }[];
};
