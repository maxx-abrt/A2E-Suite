// Shift-click range selection for the Drive list/gallery. The page owns the
// anchor id (the last row the user activated) and this util turns an anchor +
// target into the inclusive id range in the currently visible order. Keyboard
// and screen-reader users reach the same outcome through select-all, so the
// range gesture is a shortcut, never the only way to select many rows.

export const toggleDriveFileId = (
  selectedIds: string[],
  fileId: string,
): string[] =>
  selectedIds.includes(fileId)
    ? selectedIds.filter((id) => id !== fileId)
    : [...selectedIds, fileId];

export const selectDriveFilesInRange = ({
  orderedFileIds,
  anchorId,
  targetId,
}: {
  orderedFileIds: string[];
  anchorId: string | null;
  targetId: string;
}): string[] => {
  if (anchorId === null) {
    return [targetId];
  }

  const anchorIndex = orderedFileIds.indexOf(anchorId);
  const targetIndex = orderedFileIds.indexOf(targetId);

  if (anchorIndex === -1 || targetIndex === -1) {
    return [targetId];
  }

  const startIndex = Math.min(anchorIndex, targetIndex);
  const endIndex = Math.max(anchorIndex, targetIndex);

  return orderedFileIds.slice(startIndex, endIndex + 1);
};

export const removeDriveFileIds = (
  selectedIds: string[],
  idsToRemove: string[],
): string[] => {
  const removalSet = new Set(idsToRemove);

  return selectedIds.filter((id) => !removalSet.has(id));
};
