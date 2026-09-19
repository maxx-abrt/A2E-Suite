import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isSoloWorkspace } from '@/workspace-member/utils/isSoloWorkspace';

export const useIsSoloWorkspace = (): boolean => {
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );

  return isSoloWorkspace(currentWorkspaceMembers);
};
