import { INTERNAL_NAVIGATION_MENU_ITEM_ROUTE_PATHS } from '@/utils/navigation/internalNavigationMenuItemRoutePaths';

// Accepts only a host-relative path whose base matches an allow-listed native
// route. Protocol-relative ('//evil'), scheme ('javascript:'), traversal and
// unknown paths are rejected so a LINK row cannot smuggle an off-host target.
export const isInternalNavigationMenuItemRoute = (link: string): boolean => {
  const trimmedLink = link.trim();

  if (!trimmedLink.startsWith('/') || trimmedLink.startsWith('//')) {
    return false;
  }

  const path = trimmedLink.split(/[?#]/)[0];

  if (path.includes('..')) {
    return false;
  }

  const normalizedPath = path.length > 1 ? path.replace(/\/+$/, '') : path;

  return INTERNAL_NAVIGATION_MENU_ITEM_ROUTE_PATHS.some(
    (routePath) =>
      normalizedPath === routePath ||
      normalizedPath.startsWith(`${routePath}/`),
  );
};
