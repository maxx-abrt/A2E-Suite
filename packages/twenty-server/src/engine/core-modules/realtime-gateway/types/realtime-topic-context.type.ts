export type RealtimeTopicKind = 'workspace' | 'presence' | 'inbox' | 'object';

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
  isWorkspaceAgnostic: boolean;
};
