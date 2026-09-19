import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';

// A workspace with exactly one member has no collaborators, so presence,
// typing and team discussion have nothing to show; the surfaces that read this
// degrade to their personal variant instead of rendering an empty team shell.
export const SOLO_WORKSPACE_MEMBER_COUNT = 1;

export const isSoloWorkspace = (
  workspaceMembers: PartialWorkspaceMember[],
): boolean => workspaceMembers.length === SOLO_WORKSPACE_MEMBER_COUNT;
