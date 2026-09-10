import { useWorkspaceRouteObjects } from '@/app/routing/components/WorkspaceRouteObjectsProvider';
import { isWorkspaceLocationAvailableOnSurface } from '@/app/routing/utils/isWorkspaceLocationAvailableOnSurface';
import { toSidePanelLocation } from '@/side-panel/routing/utils/toSidePanelLocation';
import {
  type OpenSidePanelTabResult,
  useSidePanelTabs,
} from '@/side-panel/tabs/hooks/useSidePanelTabs';
import { isSafeInternalPath } from '@/ui/navigation/utils/isSafeInternalPath';
import { useCallback } from 'react';
import { SidePanelPages } from 'twenty-shared/types';
import { IconDotsVertical } from 'twenty-ui/icon';
import { v4 } from 'uuid';

/**
 * Generic entry point for "open this routed artifact in its own tab".
 * Records use it today; documents, messages, projects, files and invoices are
 * expected to use the very same call once their routes exist.
 */
export const useOpenRoutedPageInSidePanelTab = () => {
  const routeObjects = useWorkspaceRouteObjects();
  const { openSidePanelTab } = useSidePanelTabs();

  const openRoutedPageInSidePanelTab = useCallback(
    ({
      path,
      state,
      pageTitle,
      contextKey,
      routedFlowStateScopeId,
    }: {
      path: string;
      state?: unknown;
      pageTitle?: string;
      contextKey?: string;
      routedFlowStateScopeId?: string;
    }): OpenSidePanelTabResult | null => {
      if (!isSafeInternalPath(path)) {
        return null;
      }

      const routedLocation = toSidePanelLocation(path, state);

      if (
        !isWorkspaceLocationAvailableOnSurface(
          routeObjects,
          'side-panel',
          routedLocation,
        )
      ) {
        return null;
      }

      const pageId = v4();

      return openSidePanelTab({
        target: {
          page: SidePanelPages.RoutedPage,
          pageTitle: pageTitle ?? routedLocation.pathname,
          pageIcon: IconDotsVertical,
          pageId,
          routedFlowStateScopeId: routedFlowStateScopeId ?? pageId,
          routedLocation,
        },
        ...(contextKey !== undefined ? { contextKey } : {}),
      });
    },
    [openSidePanelTab, routeObjects],
  );

  return { openRoutedPageInSidePanelTab };
};
