import { type BureauDocument } from '@/bureau/types/BureauDocument';

// Position that places a new page after every existing sibling.
export const getBureauAppendPosition = (siblings: BureauDocument[]) =>
  siblings.reduce(
    (maxPosition, sibling) => Math.max(maxPosition, (sibling.position ?? 0) + 1),
    0,
  );
