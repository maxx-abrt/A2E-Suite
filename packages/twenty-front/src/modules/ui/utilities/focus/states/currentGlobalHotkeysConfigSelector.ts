import { focusPreferencesState } from '@/focus-preferences/states/focusPreferencesState';
import { focusStackState } from '@/ui/utilities/focus/states/focusStackState';
import { DEFAULT_GLOBAL_HOTKEYS_CONFIG } from '@/ui/utilities/hotkey/constants/DefaultGlobalHotkeysConfig';
import { type GlobalHotkeysConfig } from '@/ui/utilities/hotkey/types/GlobalHotkeysConfig';
import { createAtomSelector } from '@/ui/utilities/state/jotai/utils/createAtomSelector';
import { isDefined } from 'twenty-shared/utils';

export const currentGlobalHotkeysConfigSelector =
  createAtomSelector<GlobalHotkeysConfig>({
    key: 'currentGlobalHotkeysConfigSelector',
    get: ({ get }) => {
      const focusStack = get(focusStackState);
      const lastFocusStackItem = focusStack.at(-1);

      if (!isDefined(lastFocusStackItem)) {
        // The user's shortcut preference gates every global hotkey until a
        // focus-stack surface overrides the config for its own scope.
        const focusPreferences = get(focusPreferencesState);

        return {
          ...DEFAULT_GLOBAL_HOTKEYS_CONFIG,
          enableGlobalHotkeysWithModifiers: focusPreferences.shortcutsEnabled,
          enableGlobalHotkeysConflictingWithKeyboard:
            focusPreferences.shortcutsEnabled,
        };
      }

      return lastFocusStackItem.globalHotkeysConfig;
    },
  });
