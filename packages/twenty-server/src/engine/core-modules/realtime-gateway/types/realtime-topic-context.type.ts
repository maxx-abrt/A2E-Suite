export type RealtimeTopicKind =
  | 'workspace'
  | 'presence'
  | 'inbox'
  | 'object'
  | 'chat';

export type RealtimeTopicContext = {
  kind: RealtimeTopicKind;
  workspaceId: string;
  channelId?: string;
  userId?: string;
  objectNameSingular?: string;
  recordId?: string;
};

export type RealtimeAuthenticatedSocketContext = {
  userId: string;
  workspaceId: string;
  workspaceMemberId?: string;
  // Carried so record/channel ACL checks can resolve the caller's role from the
  // workspace cache without re-deriving it; it comes from the same access/session
  // token that authenticated the socket.
  userWorkspaceId?: string;
  isWorkspaceAgnostic: boolean;
};
