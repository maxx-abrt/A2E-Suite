import { Fragment, useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import {
  IconChevronDown,
  IconChevronRight,
  IconHeartOff,
} from 'twenty-ui/icon';
import { LightIconButton } from 'twenty-ui/input';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

import { NavigationMenuItemDroppableIds } from '@/navigation-menu-item/common/constants/NavigationMenuItemDroppableIds';
import { NavigationMenuItemBackButton } from '@/navigation-menu-item/edit/components/NavigationMenuItemBackButton';
import { NavigationMenuItemIcon } from '@/navigation-menu-item/display/components/NavigationMenuItemIcon';
import { NavigationMenuItemFolderLayout } from '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderLayout';
import { NavigationMenuItemSortableItem } from '@/navigation-menu-item/display/dnd/components/NavigationMenuItemSortableItem';
import { useDeleteManyNavigationMenuItems } from '@/navigation-menu-item/common/hooks/useDeleteManyNavigationMenuItems';
import { openNavigationMenuItemFolderIdsState } from '@/navigation-menu-item/common/states/openNavigationMenuItemFolderIdsState';
import { getNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/utils/getNavigationMenuItemComputedLink';
import { getNavigationMenuItemLabel } from '@/navigation-menu-item/display/utils/getNavigationMenuItemLabel';
import { getNavigationMenuItemObjectNameSingular } from '@/navigation-menu-item/display/object/utils/getNavigationMenuItemObjectNameSingular';
import { getObjectNavigationMenuItemSecondaryLabel } from '@/navigation-menu-item/display/object/utils/getObjectNavigationMenuItemSecondaryLabel';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
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
  // When set (focused, read-only mode), items fold behind a collapsed header
  // row instead of listing inline, keeping app shortcuts out of the way.
  collapsibleSectionLabel?: string;
};

export const NavigationMenuItemFolderContent = ({
  folderName,
  folderId,
  navigationMenuItems,
  hideBackButton = false,
  collapsibleSectionLabel = undefined,
}: NavigationMenuItemFolderContentProps) => {
  const { theme } = useContext(ThemeContext);
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const views = useAtomStateValue(viewsSelector);
  const lastVisitedViewPerObjectMetadataItem = useAtomStateValue(
    lastVisitedViewPerObjectMetadataItemState,
  );
  const [openNavigationMenuItemFolderIds, setOpenNavigationMenuItemFolderIds] =
    useAtomState(openNavigationMenuItemFolderIdsState);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);
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
  const hasActiveChild = isDefined(activeItem);
  // Mirrors the focused-folder expand semantics: an active shortcut reopens
  // the group unless the user just folded it, and a manual opening persists.
  const isOpen =
    openNavigationMenuItemFolderIds.includes(folderId) ||
    (hasActiveChild && !isManuallyClosed);
  const isCollapsible = isNonEmptyString(collapsibleSectionLabel);

  const folderDroppableId = `${NavigationMenuItemDroppableIds.FAVORITE_FOLDER_PREFIX}${folderId}`;

  const itemsNode = navigationMenuItems.map((navigationMenuItem, index) => {
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
  });

  if (isCollapsible) {
    // Same layout and expand state as the focused folders in the main drawer,
    // so a folded shortcuts group reads like any other SDK-authored folder.
    const handleCloseShortcuts = () => {
      setIsManuallyClosed(true);
      setOpenNavigationMenuItemFolderIds((current) =>
        current.filter((id) => id !== folderId),
      );
    };
    const handleOpenShortcuts = () => {
      setIsManuallyClosed(false);
      setOpenNavigationMenuItemFolderIds((current) =>
        current.includes(folderId) ? current : [...current, folderId],
      );
    };

    return (
      <NavigationMenuItemFolderLayout
        header={
          <NavigationDrawerItem
            label={collapsibleSectionLabel}
            onClick={isOpen ? handleCloseShortcuts : handleOpenShortcuts}
            active={!isOpen && hasActiveChild}
            alwaysShowRightOptions
            rightOptions={
              isOpen ? (
                <IconChevronDown
                  size={theme.icon.size.sm}
                  stroke={theme.icon.stroke.sm}
                  color={themeCssVariables.font.color.tertiary}
                />
              ) : (
                <IconChevronRight
                  size={theme.icon.size.sm}
                  stroke={theme.icon.stroke.sm}
                  color={themeCssVariables.font.color.tertiary}
                />
              )
            }
            triggerEvent="CLICK"
            preventCollapseOnMobile
          />
        }
        isOpen={isOpen}
        isGroup={false}
      >
        {itemsNode}
      </NavigationMenuItemFolderLayout>
    );
  }

  return (
    <>
      {!hideBackButton && (
        <NavigationMenuItemBackButton folderName={folderName} />
      )}
      {itemsNode}
    </>
  );
};
