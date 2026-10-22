import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import { useCallback } from 'react';

// Typing in a Bureau text field must not trigger single-key global hotkeys.
export const useBureauTextInputFocus = (focusId: string) => {
  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();

  const handleFocus = useCallback(() => {
    pushFocusItemToFocusStack({
      focusId,
      component: {
        type: FocusComponentType.TEXT_AREA,
        instanceId: focusId,
      },
      globalHotkeysConfig: {
        enableGlobalHotkeysConflictingWithKeyboard: false,
      },
    });
  }, [focusId, pushFocusItemToFocusStack]);

  const handleBlur = useCallback(() => {
    removeFocusItemFromFocusStackById({ focusId });
  }, [focusId, removeFocusItemFromFocusStackById]);

  return { handleFocus, handleBlur };
};
