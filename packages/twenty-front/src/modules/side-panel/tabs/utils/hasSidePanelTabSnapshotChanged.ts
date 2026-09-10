import { type SidePanelTab } from '@/side-panel/tabs/types/SidePanelTab';

/**
 * `updatedAt` is excluded on purpose: it changes on every snapshot and would
 * make an effect-driven sync write on every render.
 */
export const hasSidePanelTabSnapshotChanged = ({
  tab,
  nextTab,
}: {
  tab: SidePanelTab;
  nextTab: SidePanelTab;
}): boolean =>
  tab.title !== nextTab.title ||
  tab.iconKey !== nextTab.iconKey ||
  tab.activePageId !== nextTab.activePageId ||
  tab.contextKey !== nextTab.contextKey ||
  JSON.stringify(tab.stack) !== JSON.stringify(nextTab.stack);
