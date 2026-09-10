import { z } from 'zod';

export type PresenceIdentity = {
  workspaceId: string;
  userId: string;
  workspaceMemberId?: string;
  connectionId: string;
};

export const presenceMemberSchema = z.object({
  userId: z.string().min(1),
  workspaceMemberId: z.string().min(1).optional(),
  lastSeenAt: z.string().datetime(),
});

export type PresenceMember = z.infer<typeof presenceMemberSchema> & {
  isTyping: boolean;
  typingContext?: string;
};

export type PresenceEvent =
  | {
      event: 'join' | 'leave';
      member: Omit<PresenceMember, 'isTyping' | 'typingContext'>;
    }
  | {
      event: 'typing';
      member: Omit<PresenceMember, 'isTyping' | 'typingContext'>;
      isTyping: boolean;
      typingContext?: string;
    };
