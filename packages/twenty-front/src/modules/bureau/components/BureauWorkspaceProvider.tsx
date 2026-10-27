import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { useBureauWorkspaceValue } from '@/bureau/hooks/useBureauWorkspaceValue';
import { useIsBureauAvailable } from '@/bureau/hooks/useIsBureauAvailable';
import { type ReactNode } from 'react';
import { useLocation, useMatch } from 'react-router-dom';
import { useNavigationMenuItemsByFolder } from '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemsByFolder';
import { useNavigationObjectMetadataItems } from '@/navigation-menu-item/common/hooks/useNavigationObjectMetadataItems';
import { getAppNavigationMatchScore } from '@/navigation/utils/getAppNavigationMatchScore';
import { viewsSelector } from '@/views/states/selectors/viewsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { AppPath } from 'twenty-shared/types';

type BureauWorkspaceProviderProps = { children: ReactNode };

export const BureauWorkspaceProvider = ({
  children,
}: BureauWorkspaceProviderProps) => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const match = useMatch('/bureau/:documentId?');
  const isAvailable = useIsBureauAvailable();

  const { pathname, search } = useLocation();
  const { navigationMenuItemsByFolder } = useNavigationMenuItemsByFolder();
  const objectMetadataItems = useNavigationObjectMetadataItems();
  const views = useAtomStateValue(viewsSelector);
  const isBureauSection = navigationMenuItemsByFolder.some(
    (folder) =>
      folder.navigationMenuItems.some((item) => item.link === AppPath.Bureau) &&
      folder.navigationMenuItems.some(
        (item) =>
          getAppNavigationMatchScore({
            item,
            pathname,
            search,
            objectMetadataItems,
            views,
          }) > 0,
      ),
  );

  if ((!match && !isBureauSection) || !isAvailable) return children;

  return (
    <OpenedBureauWorkspaceProvider
      key={currentWorkspace?.id}
      activeDocumentId={match?.params.documentId ?? null}
    >
      {children}
    </OpenedBureauWorkspaceProvider>
  );
};

const OpenedBureauWorkspaceProvider = ({
  children,
  activeDocumentId,
}: BureauWorkspaceProviderProps & { activeDocumentId: string | null }) => {
  const value = useBureauWorkspaceValue(activeDocumentId);

  return (
    <BureauWorkspaceContext.Provider value={value}>
      {children}
    </BureauWorkspaceContext.Provider>
  );
};
