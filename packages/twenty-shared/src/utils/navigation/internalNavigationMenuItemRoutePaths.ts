// Base paths of the host routes an app-defined LINK navigation menu item may
// open in-app. A LINK row is otherwise external-only; these mirror the
// workspace router entries (AppPath.Calendar, .Drive, .Discussions, .Inbox,
// .AiChat, .Home) so an app can point its sidebar at a native page.
export const INTERNAL_NAVIGATION_MENU_ITEM_ROUTE_PATHS = [
  '/calendar',
  '/chat',
  '/discussions',
  '/drive',
  '/home',
  '/inbox',
] as const;

export type InternalNavigationMenuItemRoutePath =
  (typeof INTERNAL_NAVIGATION_MENU_ITEM_ROUTE_PATHS)[number];
