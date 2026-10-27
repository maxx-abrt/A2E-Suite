import { getA2eApplicationLogo } from '@/a2e-workspace/utils/getA2eApplicationLogo';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useA2eApplicationLogo = (applicationId?: string | null) => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const application = currentWorkspace?.installedApplications.find(
    (installedApplication) => installedApplication.id === applicationId,
  );
  return getA2eApplicationLogo(application?.universalIdentifier);
};
