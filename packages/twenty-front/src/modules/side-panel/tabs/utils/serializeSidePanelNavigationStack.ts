import {
  type SidePanelNavigationStackItem,
  type SidePanelRoutedLocation,
} from '@/side-panel/states/sidePanelNavigationStackState';
import { type SerializedSidePanelNavigationItem } from '@/side-panel/tabs/types/SidePanelTab';
import { getIconKeyFromIconComponent } from '@/side-panel/tabs/utils/getIconKeyFromIconComponent';
import { isValidSerializedSidePanelNavigationItem } from '@/side-panel/tabs/utils/isValidSidePanelTabsSession';
import { toSerializableJsonValue } from '@/side-panel/tabs/utils/toSerializableJsonValue';
import { SidePanelPages } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type IconComponent } from 'twenty-ui/icon';

const DEFAULT_SIDE_PANEL_TAB_ICON_KEY = 'IconDotsVertical';

const serializeRoutedLocation = (
  routedLocation: SidePanelRoutedLocation,
): SidePanelRoutedLocation => ({
  pathname: routedLocation.pathname,
  search: routedLocation.search,
  hash: routedLocation.hash,
  state: toSerializableJsonValue(routedLocation.state) ?? null,
  key: routedLocation.key,
});

export const serializeSidePanelNavigationItem = ({
  item,
  icons,
}: {
  item: SidePanelNavigationStackItem;
  icons: Record<string, IconComponent>;
}): SerializedSidePanelNavigationItem => {
  const pageIconKey = getIconKeyFromIconComponent({
    icons,
    iconComponent: item.pageIcon,
  });

  return {
    pageId: item.pageId,
    page: item.page,
    pageTitle: item.pageTitle,
    ...(isDefined(pageIconKey) ? { pageIconKey } : {}),
    ...(isDefined(item.pageIconColor)
      ? { pageIconColor: item.pageIconColor }
      : {}),
    ...(isDefined(item.routedFlowStateScopeId)
      ? { routedFlowStateScopeId: item.routedFlowStateScopeId }
      : {}),
    ...(item.page === SidePanelPages.RoutedPage
      ? { routedLocation: serializeRoutedLocation(item.routedLocation) }
      : {}),
  };
};

export const serializeSidePanelNavigationStack = ({
  stack,
  icons,
}: {
  stack: SidePanelNavigationStackItem[];
  icons: Record<string, IconComponent>;
}): SerializedSidePanelNavigationItem[] =>
  stack.map((item) => serializeSidePanelNavigationItem({ item, icons }));

export const deserializeSidePanelNavigationItem = ({
  item,
  getIcon,
}: {
  item: SerializedSidePanelNavigationItem;
  getIcon: (iconKey?: string | null, defaultIconKey?: string) => IconComponent;
}): SidePanelNavigationStackItem | null => {
  if (!isValidSerializedSidePanelNavigationItem(item)) {
    return null;
  }

  const pageIcon = getIcon(
    item.pageIconKey,
    DEFAULT_SIDE_PANEL_TAB_ICON_KEY,
  ) satisfies IconComponent;

  const base = {
    pageId: item.pageId,
    pageTitle: item.pageTitle,
    pageIcon,
    ...(isDefined(item.pageIconColor)
      ? { pageIconColor: item.pageIconColor }
      : {}),
    ...(isDefined(item.routedFlowStateScopeId)
      ? { routedFlowStateScopeId: item.routedFlowStateScopeId }
      : {}),
  };

  if (item.page === SidePanelPages.RoutedPage) {
    if (!isDefined(item.routedLocation)) {
      return null;
    }

    return {
      ...base,
      page: SidePanelPages.RoutedPage,
      routedLocation: item.routedLocation,
    };
  }

  return {
    ...base,
    page: item.page,
  } as SidePanelNavigationStackItem;
};

/**
 * Restoration is atomic: a stack with a single unreadable entry is discarded
 * instead of putting the panel in a half-restored state.
 */
export const deserializeSidePanelNavigationStack = ({
  stack,
  getIcon,
}: {
  stack: SerializedSidePanelNavigationItem[];
  getIcon: (iconKey?: string | null, defaultIconKey?: string) => IconComponent;
}): SidePanelNavigationStackItem[] | null => {
  const deserializedStack = stack.map((item) =>
    deserializeSidePanelNavigationItem({ item, getIcon }),
  );

  if (deserializedStack.some((item) => !isDefined(item))) {
    return null;
  }

  const validStack = deserializedStack.filter(isDefined);

  return validStack.length > 0 ? validStack : null;
};
