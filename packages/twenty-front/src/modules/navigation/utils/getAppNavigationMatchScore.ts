import { matchPath } from 'react-router-dom';
import { AppPath, NavigationMenuItemType } from 'twenty-shared/types';
import { getNavigationMenuItemObjectNameSingular } from '@/navigation-menu-item/display/object/utils/getNavigationMenuItemObjectNameSingular';
import { getNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/utils/getNavigationMenuItemComputedLink';

type GetAppNavigationMatchScoreArgs = Parameters<
  typeof getNavigationMenuItemComputedLink
>[0] & { pathname: string; search: string };

export const getAppNavigationMatchScore = ({
  pathname,
  search,
  ...linkArgs
}: GetAppNavigationMatchScoreArgs): number => {
  const link = getNavigationMenuItemComputedLink(linkArgs);
  const [targetPath, targetSearch] = link.split(/[?#]/);
  const targetViewId = new URLSearchParams(targetSearch).get('viewId');
  const currentViewId = new URLSearchParams(search).get('viewId');

  if (
    targetPath.startsWith('/') &&
    targetPath !== '/' &&
    (pathname === targetPath || pathname.startsWith(`${targetPath}/`))
  ) {
    if (linkArgs.item.type === NavigationMenuItemType.VIEW && currentViewId) {
      return targetViewId === currentViewId ? 3 : 1;
    }
    return 2;
  }

  // A full-page record uses a different native route from its table. Only
  // object/view entries own that object's records; a pinned record does not.
  if (
    linkArgs.item.type !== NavigationMenuItemType.OBJECT &&
    linkArgs.item.type !== NavigationMenuItemType.VIEW
  ) {
    return 0;
  }

  const recordRoute = matchPath(AppPath.RecordShowPage, pathname);
  const objectNameSingular = getNavigationMenuItemObjectNameSingular(
    linkArgs.item,
    linkArgs.objectMetadataItems,
    linkArgs.views,
  );

  return objectNameSingular &&
    recordRoute?.params.objectNameSingular === objectNameSingular
    ? 1
    : 0;
};
