import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

import { DEFAULT_FOCUS_PREFERENCES } from '@/focus-preferences/constants/DefaultFocusPreferences';
import { type FocusPreferences } from '@/focus-preferences/types/FocusPreferences';
import { isValidFocusPreferences } from '@/focus-preferences/utils/focusPreferences';

// Browser-local rather than a workspace-member column: focus and readability
// are personal display choices, and adding a synced field would require a
// server migration for an optional P10 preference.
export const focusPreferencesState = createAtomState<FocusPreferences>({
  key: 'a2e-focus-preferences',
  defaultValue: DEFAULT_FOCUS_PREFERENCES,
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
  validateInitFn: isValidFocusPreferences,
});
