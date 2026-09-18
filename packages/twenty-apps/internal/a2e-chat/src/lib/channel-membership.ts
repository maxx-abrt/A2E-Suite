// Channel access rules as pure data so the composer, the sidebar and the
// future ACL publisher (P2.1) share one decision. A public channel is
// readable by every workspace member; a private one only by its members.
// Posting is a second gate: the channel lists the roles it accepts.

export type ChannelVisibility = 'PUBLIC' | 'PRIVATE';

export type ChannelPostingRole = 'MEMBER' | 'ADMIN';

export type ChannelAccessInput = {
  visibility: ChannelVisibility;
  postingRoles: string[];
  isMember: boolean;
  isAdmin: boolean;
};

export const canReadChannel = (input: ChannelAccessInput): boolean =>
  input.visibility === 'PUBLIC' || input.isMember;

export const canPostToChannel = (input: ChannelAccessInput): boolean => {
  if (!canReadChannel(input)) {
    return false;
  }

  if (input.isAdmin && input.postingRoles.includes('ADMIN')) {
    return true;
  }

  return input.isMember && input.postingRoles.includes('MEMBER');
};
