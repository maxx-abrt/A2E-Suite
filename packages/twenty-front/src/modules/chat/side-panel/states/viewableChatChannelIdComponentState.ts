import { SidePanelPageComponentInstanceContext } from '@/side-panel/states/contexts/SidePanelPageComponentInstanceContext';
import { createAtomComponentState } from '@/ui/utilities/state/jotai/utils/createAtomComponentState';

// The channel the side-panel mini-chat renders. Scoped to the side-panel page
// instance so opening another channel replaces only this panel's conversation.
export const viewableChatChannelIdComponentState = createAtomComponentState<
  string | null
>({
  key: 'side-panel/viewable-chat-channel-id',
  defaultValue: null,
  componentInstanceContext: SidePanelPageComponentInstanceContext,
});
