import { isSharedDomainWorkspaceEnabledState } from '@/client-config/states/isSharedDomainWorkspaceEnabledState';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useReadDefaultDomainFromConfiguration = () => {
  const domainConfiguration = useAtomStateValue(domainConfigurationState);
  const isSharedDomainWorkspaceEnabled = useAtomStateValue(
    isSharedDomainWorkspaceEnabledState,
  );
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );

  const defaultDomain =
    isMultiWorkspaceEnabled && !isSharedDomainWorkspaceEnabled
      ? `${domainConfiguration.defaultSubdomain}.${domainConfiguration.frontDomain}`
      : domainConfiguration.frontDomain;

  return {
    defaultDomain,
  };
};
