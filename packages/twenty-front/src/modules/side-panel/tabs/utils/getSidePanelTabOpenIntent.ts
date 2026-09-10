import { type SidePanelTabOpenIntent } from '@/side-panel/tabs/types/SidePanelTabOpenIntent';

type SidePanelTabOpenIntentEvent = {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
};

const MIDDLE_MOUSE_BUTTON = 1;

/**
 * Single source of truth for "which surface should receive this open":
 * - middle-click keeps the current context and stacks a new one in a tab;
 * - cmd/ctrl-click stays a real browser navigation (full page / new window);
 * - anything else keeps the historical behavior of the caller untouched.
 */
export const getSidePanelTabOpenIntent = (
  event: SidePanelTabOpenIntentEvent,
): SidePanelTabOpenIntent => {
  if (event.button === MIDDLE_MOUSE_BUTTON) {
    return 'new-tab';
  }

  if (event.metaKey === true || event.ctrlKey === true) {
    return 'new-window';
  }

  return 'default';
};

export const isMiddleMouseButtonEvent = (
  event: SidePanelTabOpenIntentEvent,
): boolean => event.button === MIDDLE_MOUSE_BUTTON;
