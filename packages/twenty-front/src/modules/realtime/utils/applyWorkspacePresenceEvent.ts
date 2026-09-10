import {
  type WorkspacePresenceEvent,
  type WorkspacePresenceMember,
} from '~/modules/realtime/types/WorkspacePresence';

export const applyWorkspacePresenceEvent = (
  currentMembers: WorkspacePresenceMember[],
  event: WorkspacePresenceEvent,
): WorkspacePresenceMember[] => {
  if (event.event === 'leave') {
    return currentMembers.filter(
      (member) => member.userId !== event.member.userId,
    );
  }

  const existingMember = currentMembers.find(
    (member) => member.userId === event.member.userId,
  );
  const nextMember: WorkspacePresenceMember = {
    ...event.member,
    isTyping:
      event.event === 'typing'
        ? event.isTyping
        : (existingMember?.isTyping ?? false),
    typingContext:
      event.event === 'typing'
        ? event.typingContext
        : existingMember?.typingContext,
  };

  return [
    nextMember,
    ...currentMembers.filter((member) => member.userId !== event.member.userId),
  ].sort((firstMember, secondMember) =>
    secondMember.lastSeenAt.localeCompare(firstMember.lastSeenAt),
  );
};
