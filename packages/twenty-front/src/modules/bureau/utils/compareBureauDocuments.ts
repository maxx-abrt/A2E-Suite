import { type BureauDocument } from '@/bureau/types/BureauDocument';

// Sibling order: `position` ascending, creation time as a stable tie-break.
export const compareBureauDocuments = (
  first: BureauDocument,
  second: BureauDocument,
) => {
  const firstPosition = first.position ?? 0;
  const secondPosition = second.position ?? 0;

  if (firstPosition !== secondPosition) {
    return firstPosition - secondPosition;
  }

  // Optimistic records can enter the tree before server timestamps arrive.
  return (
    (first.createdAt ?? '').localeCompare(second.createdAt ?? '') ||
    first.id.localeCompare(second.id)
  );
};
