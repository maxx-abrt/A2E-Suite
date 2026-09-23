export const excludeWorkspaceIds = (
  workspaceIds: string[],
  workspaceIdsToExclude: string[],
): string[] => {
  if (workspaceIdsToExclude.length === 0) {
    return workspaceIds;
  }

  const excludedWorkspaceIds = new Set(workspaceIdsToExclude);

  return workspaceIds.filter(
    (workspaceId) => !excludedWorkspaceIds.has(workspaceId),
  );
};
