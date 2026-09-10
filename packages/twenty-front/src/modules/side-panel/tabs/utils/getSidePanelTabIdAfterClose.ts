import { type SidePanelTab } from '@/side-panel/tabs/types/SidePanelTab';

/**
 * Closing the active tab hands focus to the tab on its right, falling back to
 * the one on its left. This matches the browser/editor convention users already
 * have muscle memory for.
 */
export const getSidePanelTabIdAfterClose = ({
  tabs,
  closedTabId,
}: {
  tabs: SidePanelTab[];
  closedTabId: string;
}): string | null => {
  const closedTabIndex = tabs.findIndex((tab) => tab.id === closedTabId);

  if (closedTabIndex === -1) {
    return null;
  }

  const remainingTabs = tabs.filter((tab) => tab.id !== closedTabId);

  if (remainingTabs.length === 0) {
    return null;
  }

  const neighborTab = remainingTabs[closedTabIndex] ?? remainingTabs.at(-1);

  return neighborTab?.id ?? null;
};
