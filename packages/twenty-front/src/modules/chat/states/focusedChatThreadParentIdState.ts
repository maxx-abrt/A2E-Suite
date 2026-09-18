import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// Parent message shown in the dedicated thread pane, separate from the inline
// expansion so a member can read a thread without leaving the channel.
export const focusedChatThreadParentIdState = createAtomState<string | null>({
  key: 'focusedChatThreadParentIdState',
  defaultValue: null,
});
