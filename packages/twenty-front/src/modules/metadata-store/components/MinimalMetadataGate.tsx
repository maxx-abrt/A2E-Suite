import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { usePreloadWorkspaceRoute } from '@/app/routing/hooks/usePreloadWorkspaceRoute';
import { preloadNavigationDrawerSections } from '@/navigation/components/MainNavigationDrawerScrollableItems';

import { isMinimalMetadataReadyState } from '@/metadata-store/states/isMinimalMetadataReadyState';
import { PreComputedChipGeneratorsProvider } from '@/object-metadata/components/PreComputedChipGeneratorsProvider';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { UserOrMetadataLoader } from '~/loading/components/UserOrMetadataLoader';

export const MinimalMetadataGate = () => {
  const { pathname } = useLocation();
  const preloadWorkspaceRoute = usePreloadWorkspaceRoute();

  useEffect(() => {
    // Download code while metadata is in flight instead of after the gate opens.
    preloadWorkspaceRoute(pathname);
    preloadNavigationDrawerSections();
  }, [pathname, preloadWorkspaceRoute]);

  const isMinimalMetadataReady = useAtomStateValue(isMinimalMetadataReadyState);

  if (!isMinimalMetadataReady) {
    return <UserOrMetadataLoader />;
  }

  return (
    <PreComputedChipGeneratorsProvider>
      <Outlet />
    </PreComputedChipGeneratorsProvider>
  );
};
