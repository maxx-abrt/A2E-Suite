// Re-notification policy for edited bodies: a mention already present in the
// previous revision is not a new mention, so an edit that merely moves text
// around never re-pings the same member.
export const subtractMentionedWorkspaceMemberIds = ({
  mentionedWorkspaceMemberIds,
  alreadyMentionedWorkspaceMemberIds,
}: {
  mentionedWorkspaceMemberIds: string[];
  alreadyMentionedWorkspaceMemberIds: string[];
}): string[] => {
  const alreadyMentioned = new Set(alreadyMentionedWorkspaceMemberIds);

  return mentionedWorkspaceMemberIds.filter((id) => !alreadyMentioned.has(id));
};
