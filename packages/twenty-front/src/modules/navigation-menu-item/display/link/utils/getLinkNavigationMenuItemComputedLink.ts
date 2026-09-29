import { isInternalNavigationMenuItemRoute } from 'twenty-shared/utils';

import { type NavigationMenuItem } from '~/generated-metadata/graphql';

export const getLinkNavigationMenuItemComputedLink = (
  item: Pick<NavigationMenuItem, 'link'>,
): string => {
  const linkUrl = (item.link ?? '').trim();

  // An allow-listed host route stays relative so the drawer renders an in-app
  // <Link>; anything else keeps the external https:// behaviour.
  if (isInternalNavigationMenuItemRoute(linkUrl)) {
    return linkUrl;
  }

  if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
    return linkUrl;
  }

  return linkUrl ? `https://${linkUrl}` : '';
};
