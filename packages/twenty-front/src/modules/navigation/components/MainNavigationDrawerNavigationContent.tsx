import { NavigationMenuItemFolderContentDispatcherEffect } from '@/navigation-menu-item/edit/components/NavigationMenuItemFolderContentDispatcher';
import { FocusedAppNavigationDrawerContent } from '@/navigation/components/FocusedAppNavigationDrawerContent';
import { useNavigationMenuItemsByFolder } from '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemsByFolder';
import { MainNavigationDrawerScrollableItems } from '@/navigation/components/MainNavigationDrawerScrollableItems';
import { currentNavigationMenuItemFolderIdState } from '@/navigation-menu-item/common/states/currentNavigationMenuItemFolderIdState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const MainNavigationDrawerNavigationContent = () => {
  const currentNavigationMenuItemFolderId = useAtomStateValue(
    currentNavigationMenuItemFolderIdState,
  );
  const { navigationMenuItemsByFolder } = useNavigationMenuItemsByFolder();

  const openedNavigationMenuItemFolder = navigationMenuItemsByFolder.find(
    (folder) => folder.id === currentNavigationMenuItemFolderId,
  );

  return (
    <FocusedAppNavigationDrawerContent>
      {openedNavigationMenuItemFolder ? (
        <NavigationMenuItemFolderContentDispatcherEffect
          folderName={openedNavigationMenuItemFolder.folderName}
          folderId={openedNavigationMenuItemFolder.id ?? ''}
          navigationMenuItems={
            openedNavigationMenuItemFolder.navigationMenuItems
          }
        />
      ) : (
        <MainNavigationDrawerScrollableItems />
      )}
    </FocusedAppNavigationDrawerContent>
  );
};
