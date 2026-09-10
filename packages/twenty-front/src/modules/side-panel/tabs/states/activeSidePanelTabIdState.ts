import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const ACTIVE_SIDE_PANEL_TAB_ID_STORAGE_KEY = 'a2e-side-panel-active-tab';

/**
 * `null` is a real state, not an absence: the panel can legitimately show a
 * context that is not held by any tab (command menu, a URL-restored record).
 */
export const activeSidePanelTabIdState = createAtomState<string | null>({
  key: ACTIVE_SIDE_PANEL_TAB_ID_STORAGE_KEY,
  defaultValue: null,
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
  validateInitFn: (payload) => typeof payload === 'string',
});
