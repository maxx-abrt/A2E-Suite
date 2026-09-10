import { SIDE_PANEL_TABS_MAX_COUNT } from '@/side-panel/tabs/constants/SidePanelTabsMaxCount';
import { type SidePanelTab } from '@/side-panel/tabs/types/SidePanelTab';

/**
 * LRU eviction: when the strip is full, the tab whose context was touched
 * longest ago is dropped. The active tab is never evicted, so the surface the
 * user is looking at can never disappear under them.
 */
export const applySidePanelTabsLruLimit = ({
  tabs,
  activeTabId,
  maxCount = SIDE_PANEL_TABS_MAX_COUNT,
}: {
  tabs: SidePanelTab[];
  activeTabId: string | null;
  maxCount?: number;
}): { tabs: SidePanelTab[]; evictedTabs: SidePanelTab[] } => {
  if (tabs.length <= maxCount) {
    return { tabs, evictedTabs: [] };
  }

  const evictionCandidates = [...tabs]
    .filter((tab) => tab.id !== activeTabId)
    .sort((tabA, tabB) => tabA.updatedAt - tabB.updatedAt);

  const evictedTabs = evictionCandidates.slice(0, tabs.length - maxCount);
  const evictedTabIds = new Set(evictedTabs.map((tab) => tab.id));

  return {
    tabs: tabs.filter((tab) => !evictedTabIds.has(tab.id)),
    evictedTabs,
  };
};
