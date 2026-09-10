import { SIDE_PANEL_TABS_SCHEMA_VERSION } from '@/side-panel/tabs/constants/SidePanelTabsSchemaVersion';
import { type SidePanelTabsSession } from '@/side-panel/tabs/types/SidePanelTab';
import { isValidSidePanelTabsSession } from '@/side-panel/tabs/utils/isValidSidePanelTabsSession';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const SIDE_PANEL_TABS_STORAGE_KEY = 'a2e-side-panel-tabs';

export const EMPTY_SIDE_PANEL_TABS_SESSION: SidePanelTabsSession = {
  version: SIDE_PANEL_TABS_SCHEMA_VERSION,
  tabs: [],
};

export const sidePanelTabsState = createAtomState<SidePanelTabsSession>({
  key: SIDE_PANEL_TABS_STORAGE_KEY,
  defaultValue: EMPTY_SIDE_PANEL_TABS_SESSION,
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
  // A payload from another schema version, or one that lost its shape, falls
  // back to an empty session instead of hydrating an unrenderable stack.
  validateInitFn: isValidSidePanelTabsSession,
});
