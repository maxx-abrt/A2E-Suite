import { type SidePanelRoutedLocation } from '@/side-panel/states/sidePanelNavigationStackState';
import { type SidePanelPages } from 'twenty-shared/types';

/**
 * The live navigation stack carries `pageIcon: IconComponent`, which is a React
 * component and therefore cannot cross a JSON boundary. Persisted entries keep
 * a canonical Twenty icon *key* instead and resolve it back through `useIcons`.
 */
export type SerializedSidePanelNavigationItem = {
  pageId: string;
  page: SidePanelPages;
  pageTitle: string;
  pageIconKey?: string;
  pageIconColor?: string;
  routedLocation?: SidePanelRoutedLocation;
  routedFlowStateScopeId?: string;
};

export type SidePanelTab = {
  id: string;
  title: string;
  iconKey?: string;
  /** Full navigation stack of the tab, so back navigation survives a switch. */
  stack: SerializedSidePanelNavigationItem[];
  activePageId: string;
  /**
   * Stable identity of the thing the tab holds (`record:company:<uuid>`,
   * later `document:<uuid>`, `channel:<uuid>`, `invoice:<uuid>`...). Used to
   * deduplicate instead of opening the same context twice.
   */
  contextKey?: string;
  createdAt: number;
  updatedAt: number;
};

export type SidePanelTabsSession = {
  version: number;
  tabs: SidePanelTab[];
};
