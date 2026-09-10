import { SIDE_PANEL_PATH_SEARCH_PARAM } from '@/side-panel/routing/constants/SidePanelPathSearchParam';
import { useSidePanelTabs } from '@/side-panel/tabs/hooks/useSidePanelTabs';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reload restoration. Runs once, before the user can act, and defers to the
 * URL when it already projects a side-panel path.
 */
export const SidePanelTabsRestoreEffect = () => {
  const location = useLocation();
  const { restoreSidePanelTabsSession } = useSidePanelTabs();

  // One-shot guard: restoration is a boot step, not reactive state.
  // oxlint-disable-next-line twenty/no-state-useref
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current) {
      return;
    }

    hasRestoredRef.current = true;

    const routedPathInUrl = new URLSearchParams(location.search).get(
      SIDE_PANEL_PATH_SEARCH_PARAM,
    );

    restoreSidePanelTabsSession({ routedPathInUrl });
  }, [location.search, restoreSidePanelTabsSession]);

  return null;
};
