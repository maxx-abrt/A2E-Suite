// Who caused the lifecycle event. A system actor (import, workflow, scheduled
// job) has no workspace member, so both identifiers stay optional and `type`
// disambiguates an event whose actor was not resolved.
export type CrossAppEventActor = {
  type: 'workspaceMember' | 'system';
  workspaceMemberId?: string;
  userWorkspaceId?: string;
};
