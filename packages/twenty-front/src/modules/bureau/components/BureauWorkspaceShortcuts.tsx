import { useNavigationMenuItemsByFolder } from '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemsByFolder';
import { getNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/utils/getNavigationMenuItemComputedLink';
import { getNavigationMenuItemLabel } from '@/navigation-menu-item/display/utils/getNavigationMenuItemLabel';
import { lastVisitedViewPerObjectMetadataItemState } from '@/navigation/states/lastVisitedViewPerObjectMetadataItemState';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { filterAndSortNavigationMenuItems } from '@/navigation-menu-item/common/utils/filterAndSortNavigationMenuItems';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { viewsSelector } from '@/views/states/selectors/viewsSelector';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Link } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { IconLink, useIcons } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledShortcuts = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLink = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  min-height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
  text-decoration: none;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

export const BureauWorkspaceShortcuts = () => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const { navigationMenuItemsByFolder } = useNavigationMenuItemsByFolder();
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const views = useAtomStateValue(viewsSelector);
  const lastVisitedViewPerObjectMetadataItem = useAtomStateValue(
    lastVisitedViewPerObjectMetadataItemState,
  );
  const bureauFolder = navigationMenuItemsByFolder.find((folder) =>
    folder.navigationMenuItems.some((item) => item.link === AppPath.Bureau),
  );
  // Share the editable native folder, including removals, names and order.
  const shortcuts = filterAndSortNavigationMenuItems(
    bureauFolder?.navigationMenuItems ?? [],
    views,
    readableObjectMetadataItems,
  )
    .filter((item) => item.link !== AppPath.Bureau)
    .map((item) => ({
      item,
      link: getNavigationMenuItemComputedLink({
        item,
        objectMetadataItems: readableObjectMetadataItems,
        views,
        lastVisitedViewPerObjectMetadataItem,
      }),
    }))
    .filter(({ link }) => link !== '');

  if (shortcuts.length === 0) return null;

  return (
    <StyledShortcuts aria-label={t`Bureau shortcuts`}>
      {shortcuts.map(({ item, link }) => {
        const Icon = item.icon ? getIcon(item.icon) : IconLink;
        return (
          <StyledLink key={item.id} to={link}>
            <Icon size={16} aria-hidden={true} />
            {getNavigationMenuItemLabel(
              item,
              readableObjectMetadataItems,
              views,
            )}
          </StyledLink>
        );
      })}
    </StyledShortcuts>
  );
};
