import { Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { IconHeartOff } from 'twenty-ui/icon';
import { LightIconButton } from 'twenty-ui/input';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

import { NavigationMenuItemDroppableIds } from '@/navigation-menu-item/common/constants/NavigationMenuItemDroppableIds';
import { NavigationMenuItemBackButton } from '@/navigation-menu-item/edit/components/NavigationMenuItemBackButton';
import { NavigationMenuItemIcon } from '@/navigation-menu-item/display/components/NavigationMenuItemIcon';
import { NavigationMenuItemSortableItem } from '@/navigation-menu-item/display/dnd/components/NavigationMenuItemSortableItem';
import { useDeleteManyNavigationMenuItems } from '@/navigation-menu-item/common/hooks/useDeleteManyNavigationMenuItems';
import { getNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/utils/getNavigationMenuItemComputedLink';
import { getNavigationMenuItemLabel } from '@/navigation-menu-item/display/utils/getNavigationMenuItemLabel';
import { getNavigationMenuItemObjectNameSingular } from '@/navigation-menu-item/display/object/utils/getNavigationMenuItemObjectNameSingular';
import { getObjectNavigationMenuItemSecondaryLabel } from '@/navigation-menu-item/display/object/utils/getObjectNavigationMenuItemSecondaryLabel';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { viewsSelector } from '@/views/states/selectors/viewsSelector';
import { lastVisitedViewPerObjectMetadataItemState } from '@/navigation/states/lastVisitedViewPerObjectMetadataItemState';
import { getAppNavigationMatchScore } from '@/navigation/utils/getAppNavigationMatchScore';

type NavigationMenuItemFolderContentProps = {
  folderId: string;
  folderName: string;
  navigationMenuItems: NavigationMenuItem[];
  hideBackButton?: boolean;
};

export const NavigationMenuItemFolderContent = ({
  folderName,
  folderId,
  navigationMenuItems,
  hideBackButton = false,
}: NavigationMenuItemFolderContentProps) => {
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const views = useAtomStateValue(viewsSelector);
  const lastVisitedViewPerObjectMetadataItem = useAtomStateValue(
    lastVisitedViewPerObjectMetadataItemState,
  );
  const { deleteManyNavigationMenuItems } = useDeleteManyNavigationMenuItems();
  const { pathname, search } = useLocation();
  const activeItem = navigationMenuItems
    .map((item) => ({
      id: item.id,
      score: getAppNavigationMatchScore({
        item,
        pathname,
        search,
        objectMetadataItems,
        views,
      }),
    }))
    .sort((left, right) => right.score - left.score)
    .find(({ score }) => score > 0);

  const folderDroppableId = `${NavigationMenuItemDroppableIds.FAVORITE_FOLDER_PREFIX}${folderId}`;

  return (
    <>
      {!hideBackButton && (
        <NavigationMenuItemBackButton folderName={folderName} />
      )}
      {navigationMenuItems.map((navigationMenuItem, index) => {
        const label = getNavigationMenuItemLabel(
          navigationMenuItem,
          objectMetadataItems,
          views,
        );
        const computedLink = getNavigationMenuItemComputedLink({
          item: navigationMenuItem,
          objectMetadataItems,
          views,
          lastVisitedViewPerObjectMetadataItem,
        });
        const objectNameSingular = getNavigationMenuItemObjectNameSingular(
          navigationMenuItem,
          objectMetadataItems,
          views,
        );

        const content = (
          <NavigationDrawerItem
            active={navigationMenuItem.id === activeItem?.id}
            secondaryLabel={getObjectNavigationMenuItemSecondaryLabel({
              objectMetadataItems,
              navigationMenuItemObjectNameSingular: objectNameSingular ?? '',
            })}
            label={label}
            Icon={() => (
              <NavigationMenuItemIcon navigationMenuItem={navigationMenuItem} />
            )}
            rightOptions={
              !hideBackButton ? (
                <LightIconButton
                  Icon={IconHeartOff}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteManyNavigationMenuItems([navigationMenuItem.id]);
                  }}
                  accent="tertiary"
                />
              ) : undefined
            }
            triggerEvent="CLICK"
            to={computedLink}
          />
        );
        // Focused app navigation is read-only; a row must not double as a drag handle.
        return hideBackButton ? (
          <Fragment key={navigationMenuItem.id}>{content}</Fragment>
        ) : (
          <NavigationMenuItemSortableItem
            key={navigationMenuItem.id}
            id={navigationMenuItem.id}
            index={index}
            group={folderDroppableId}
          >
            {content}
          </NavigationMenuItemSortableItem>
        );
      })}
    </>
  );
};
