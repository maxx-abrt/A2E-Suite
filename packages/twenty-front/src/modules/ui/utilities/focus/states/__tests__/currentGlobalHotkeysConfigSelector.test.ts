import { getDefaultStore } from 'jotai';

import { DEFAULT_FOCUS_PREFERENCES } from '@/focus-preferences/constants/DefaultFocusPreferences';
import { focusPreferencesState } from '@/focus-preferences/states/focusPreferencesState';
import { currentGlobalHotkeysConfigSelector } from '@/ui/utilities/focus/states/currentGlobalHotkeysConfigSelector';
import { focusStackState } from '@/ui/utilities/focus/states/focusStackState';

const store = getDefaultStore();

describe('currentGlobalHotkeysConfigSelector', () => {
  beforeEach(() => {
    store.set(focusPreferencesState.atom, DEFAULT_FOCUS_PREFERENCES);
    store.set(focusStackState.atom, []);
  });

  it('enables global hotkeys by default', () => {
    expect(store.get(currentGlobalHotkeysConfigSelector.atom)).toEqual({
      enableGlobalHotkeysWithModifiers: true,
      enableGlobalHotkeysConflictingWithKeyboard: true,
    });
  });

  it('disables global hotkeys when the user turns shortcuts off', () => {
    store.set(focusPreferencesState.atom, {
      ...DEFAULT_FOCUS_PREFERENCES,
      shortcutsEnabled: false,
    });

    expect(store.get(currentGlobalHotkeysConfigSelector.atom)).toEqual({
      enableGlobalHotkeysWithModifiers: false,
      enableGlobalHotkeysConflictingWithKeyboard: false,
    });
  });
});
