import { renderHook } from '@testing-library/react';
import { Provider } from 'jotai';

import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { isSharedDomainWorkspaceEnabledState } from '@/client-config/states/isSharedDomainWorkspaceEnabledState';
import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import { useIsCurrentLocationOnDefaultDomain } from '@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain';
import { useReadDefaultDomainFromConfiguration } from '@/domain-manager/hooks/useReadDefaultDomainFromConfiguration';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const renderDomainContext = () =>
  renderHook(
    () => ({
      ...useReadDefaultDomainFromConfiguration(),
      ...useIsCurrentLocationOnDefaultDomain(),
      ...useIsCurrentLocationOnAWorkspace(),
    }),
    {
      wrapper: ({ children }) => (
        <Provider store={jotaiStore}>{children}</Provider>
      ),
    },
  );

describe('shared-domain routing', () => {
  beforeEach(() => {
    resetJotaiStore();
    jotaiStore.set(domainConfigurationState.atom, {
      frontDomain: window.location.hostname,
      defaultSubdomain: 'app',
    });
  });

  it('uses the existing app host for both account entry and authenticated workspace routes', () => {
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    jotaiStore.set(isSharedDomainWorkspaceEnabledState.atom, true);
    const { result } = renderDomainContext();
    expect(result.current).toEqual({
      defaultDomain: window.location.hostname,
      isDefaultDomain: true,
      isOnAWorkspace: true,
    });
  });

  it('preserves domain routing when shared-domain mode is disabled', () => {
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    const { result } = renderDomainContext();
    expect(result.current).toEqual({
      defaultDomain: `app.${window.location.hostname}`,
      isDefaultDomain: false,
      isOnAWorkspace: true,
    });
  });

  it('does not mistake another host for the central account host in shared mode', () => {
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    jotaiStore.set(isSharedDomainWorkspaceEnabledState.atom, true);
    jotaiStore.set(domainConfigurationState.atom, {
      frontDomain: 'bureau.example.com',
    });
    const { result } = renderDomainContext();
    expect(result.current.defaultDomain).toBe('bureau.example.com');
    expect(result.current.isDefaultDomain).toBe(false);
  });
});
