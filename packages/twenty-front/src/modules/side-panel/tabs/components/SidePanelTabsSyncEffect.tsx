import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import { activeSidePanelTabIdState } from '@/side-panel/tabs/states/activeSidePanelTabIdState';
import { useSidePanelTabs } from '@/side-panel/tabs/hooks/useSidePanelTabs';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useEffect } from 'react';

/**
 * Keeps the active tab's persisted stack, title and icon in step with the live
 * panel: a record renamed, a sub-page pushed or a title resolved late all land
 * in the session that a reload will restore.
 */
export const SidePanelTabsSyncEffect = () => {
  const sidePanelNavigationStack = useAtomStateValue(
    sidePanelNavigationStackState,
  );
  const activeSidePanelTabId = useAtomStateValue(activeSidePanelTabIdState);
  const { syncActiveTabFromNavigationStack } = useSidePanelTabs();

  useEffect(() => {
    syncActiveTabFromNavigationStack();
  }, [
    activeSidePanelTabId,
    sidePanelNavigationStack,
    syncActiveTabFromNavigationStack,
  ]);

  return null;
};
