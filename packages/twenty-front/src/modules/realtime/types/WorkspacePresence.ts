export type WorkspacePresenceMember = {
  userId: string;
  workspaceMemberId?: string | null;
  lastSeenAt: string;
  isTyping: boolean;
  typingContext?: string | null;
};

export type WorkspacePresenceEvent =
  | {
      event: 'join' | 'leave';
      member: Omit<WorkspacePresenceMember, 'isTyping' | 'typingContext'>;
    }
  | {
      event: 'typing';
      member: Omit<WorkspacePresenceMember, 'isTyping' | 'typingContext'>;
      isTyping: boolean;
      typingContext?: string;
    };
