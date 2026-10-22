import { BureauNavigation } from '@/bureau/components/BureauNavigation';
import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { useNavigationObjectMetadataItems } from '@/navigation-menu-item/common/hooks/useNavigationObjectMetadataItems';
import { useNavigationMenuItemsByFolder } from '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemsByFolder';
import { NavigationMenuItemFolderContent } from '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderContent';
import { getNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/utils/getNavigationMenuItemComputedLink';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { viewsSelector } from '@/views/states/selectors/viewsSelector';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IconArrowLeft } from 'twenty-ui/icon';

type FocusedAppNavigationDrawerContentProps = { children: ReactNode };

export const FocusedAppNavigationDrawerContent = ({
  children,
}: FocusedAppNavigationDrawerContentProps) => {
  const { t } = useLingui();
  const workspace = useContext(BureauWorkspaceContext);
  const { pathname } = useLocation();
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);
  const { navigationMenuItemsByFolder } = useNavigationMenuItemsByFolder();
  const objectMetadataItems = useNavigationObjectMetadataItems();
  const views = useAtomStateValue(viewsSelector);
  // App ownership follows the existing, permission-filtered folder links;
  // renaming a folder or adding an app does not need another app registry.
  const activeFolder = navigationMenuItemsByFolder.find((folder) =>
    folder.navigationMenuItems.some((item) => {
      const link = getNavigationMenuItemComputedLink({
        item,
        objectMetadataItems,
        views,
      });
      const targetPath = link.split(/[?#]/)[0];
      return (
        targetPath.startsWith('/') &&
        targetPath !== '/' &&
        (pathname === targetPath || pathname.startsWith(`${targetPath}/`))
      );
    }),
  );
  if (!activeFolder && !workspace) return children;

  if (dismissedPath === pathname)
    return (
      <>
        <NavigationDrawerItem
          label={t`Back to ${activeFolder?.folderName ?? 'Bureau'}`}
          Icon={IconArrowLeft}
          onClick={() => setDismissedPath(null)}
        />
        {children}
      </>
    );

  return (
    <>
      <NavigationDrawerItem
        label={t`All apps`}
        Icon={IconArrowLeft}
        onClick={() => setDismissedPath(pathname)}
      />
      {activeFolder && (
        <NavigationMenuItemFolderContent
          folderId={activeFolder.id}
          folderName={t`All apps`}
          navigationMenuItems={activeFolder.navigationMenuItems}
          hideBackButton
        />
      )}
      <BureauNavigation />
    </>
  );
};
