import { type WorkspacePresenceMember } from '~/modules/realtime/types/WorkspacePresence';
import { applyWorkspacePresenceEvent } from '~/modules/realtime/utils/applyWorkspacePresenceEvent';

const firstMember: WorkspacePresenceMember = {
  userId: 'user-1',
  workspaceMemberId: 'member-1',
  lastSeenAt: '2026-09-10T10:00:00.000Z',
  isTyping: false,
};

describe('applyWorkspacePresenceEvent', () => {
  it('adds a member on join', () => {
    expect(
      applyWorkspacePresenceEvent([], {
        event: 'join',
        member: firstMember,
      }),
    ).toEqual([firstMember]);
  });

  it('updates typing state without duplicating the member', () => {
    expect(
      applyWorkspacePresenceEvent([firstMember], {
        event: 'typing',
        member: {
          userId: firstMember.userId,
          workspaceMemberId: firstMember.workspaceMemberId,
          lastSeenAt: '2026-09-10T10:01:00.000Z',
        },
        isTyping: true,
        typingContext: 'record:company:1',
      }),
    ).toEqual([
      {
        ...firstMember,
        lastSeenAt: '2026-09-10T10:01:00.000Z',
        isTyping: true,
        typingContext: 'record:company:1',
      },
    ]);
  });

  it('removes a member on leave', () => {
    expect(
      applyWorkspacePresenceEvent([firstMember], {
        event: 'leave',
        member: firstMember,
      }),
    ).toEqual([]);
  });
});
