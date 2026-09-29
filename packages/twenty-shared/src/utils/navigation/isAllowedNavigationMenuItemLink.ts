import { isInternalNavigationMenuItemRoute } from '@/utils/navigation/isInternalNavigationMenuItemRoute';
import { isValidUrl } from '@/utils/url/isValidUrl';

// A LINK nav item may target an absolute external URL or an allow-listed host
// route. Protocol-relative targets ('//evil.com') are rejected even though the
// URL parser would resolve them: the sidebar treats them as external and the
// destination would escape the app.
export const isAllowedNavigationMenuItemLink = (link: string): boolean => {
  const trimmedLink = link.trim();

  if (trimmedLink.startsWith('//')) {
    return false;
  }

  return (
    isValidUrl(trimmedLink) || isInternalNavigationMenuItemRoute(trimmedLink)
  );
};
