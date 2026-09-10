import { getSidePanelTabOpenIntent } from '@/side-panel/tabs/utils/getSidePanelTabOpenIntent';
import { useCallback, useMemo, type MouseEvent } from 'react';

/**
 * Reusable middle-click primitive.
 *
 * Handlers are installed in the *capture* phase because most Twenty open paths
 * fire on `mousedown` on a descendant: without capture, the normal open would
 * already have run by the time the aux click bubbles up.
 */
export const useSidePanelTabOpenIntentHandlers = ({
  onOpenInTab,
  isEnabled = true,
}: {
  onOpenInTab: () => void;
  isEnabled?: boolean;
}) => {
  const handleMouseDownCapture = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!isEnabled || getSidePanelTabOpenIntent(event) !== 'new-tab') {
        return;
      }

      // Stops middle-click autoscroll and the MOUSE_DOWN open paths.
      event.preventDefault();
      event.stopPropagation();
    },
    [isEnabled],
  );

  const handleAuxClickCapture = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!isEnabled || getSidePanelTabOpenIntent(event) !== 'new-tab') {
        return;
      }

      // Prevents the browser from turning a middle-click on a link into a
      // real new browser tab.
      event.preventDefault();
      event.stopPropagation();

      onOpenInTab();
    },
    [isEnabled, onOpenInTab],
  );

  return useMemo(
    () => ({
      onMouseDownCapture: handleMouseDownCapture,
      onAuxClickCapture: handleAuxClickCapture,
    }),
    [handleAuxClickCapture, handleMouseDownCapture],
  );
};
