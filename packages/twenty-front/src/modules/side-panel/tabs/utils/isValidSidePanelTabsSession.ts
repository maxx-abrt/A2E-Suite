import { SIDE_PANEL_TABS_MAX_COUNT } from '@/side-panel/tabs/constants/SidePanelTabsMaxCount';
import { SIDE_PANEL_TABS_SCHEMA_VERSION } from '@/side-panel/tabs/constants/SidePanelTabsSchemaVersion';
import {
  type SerializedSidePanelNavigationItem,
  type SidePanelTab,
  type SidePanelTabsSession,
} from '@/side-panel/tabs/types/SidePanelTab';
import { SidePanelPages } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

const SIDE_PANEL_PAGE_VALUES = new Set<string>(Object.values(SidePanelPages));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isValidRoutedLocation = (value: unknown): boolean => {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.pathname === 'string' &&
    typeof value.search === 'string' &&
    typeof value.hash === 'string' &&
    (!isDefined(value.key) || typeof value.key === 'string')
  );
};

export const isValidSerializedSidePanelNavigationItem = (
  value: unknown,
): value is SerializedSidePanelNavigationItem => {
  if (!isPlainObject(value)) {
    return false;
  }

  if (
    !isNonEmptyString(value.pageId) ||
    !isNonEmptyString(value.page) ||
    !SIDE_PANEL_PAGE_VALUES.has(value.page) ||
    typeof value.pageTitle !== 'string'
  ) {
    return false;
  }

  if (isDefined(value.pageIconKey) && typeof value.pageIconKey !== 'string') {
    return false;
  }

  if (
    isDefined(value.pageIconColor) &&
    typeof value.pageIconColor !== 'string'
  ) {
    return false;
  }

  if (
    isDefined(value.routedFlowStateScopeId) &&
    typeof value.routedFlowStateScopeId !== 'string'
  ) {
    return false;
  }

  // A routed page without its location cannot be rendered, and a purpose-built
  // page with one would leak a route it does not own.
  if (value.page === SidePanelPages.RoutedPage) {
    return isValidRoutedLocation(value.routedLocation);
  }

  return !isDefined(value.routedLocation);
};

export const isValidSidePanelTab = (value: unknown): value is SidePanelTab => {
  if (!isPlainObject(value)) {
    return false;
  }

  if (
    !isNonEmptyString(value.id) ||
    typeof value.title !== 'string' ||
    !isNonEmptyString(value.activePageId) ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number' ||
    !Number.isFinite(value.createdAt) ||
    !Number.isFinite(value.updatedAt)
  ) {
    return false;
  }

  if (isDefined(value.iconKey) && typeof value.iconKey !== 'string') {
    return false;
  }

  if (isDefined(value.contextKey) && typeof value.contextKey !== 'string') {
    return false;
  }

  if (!Array.isArray(value.stack) || value.stack.length === 0) {
    return false;
  }

  if (!value.stack.every(isValidSerializedSidePanelNavigationItem)) {
    return false;
  }

  return value.stack.some((item) => item.pageId === value.activePageId);
};

export const isValidSidePanelTabsSession = (
  value: unknown,
): value is SidePanelTabsSession => {
  if (!isPlainObject(value)) {
    return false;
  }

  if (value.version !== SIDE_PANEL_TABS_SCHEMA_VERSION) {
    return false;
  }

  if (!Array.isArray(value.tabs)) {
    return false;
  }

  if (value.tabs.length > SIDE_PANEL_TABS_MAX_COUNT) {
    return false;
  }

  if (!value.tabs.every(isValidSidePanelTab)) {
    return false;
  }

  const tabIds = value.tabs.map((tab) => tab.id);

  return new Set(tabIds).size === tabIds.length;
};
