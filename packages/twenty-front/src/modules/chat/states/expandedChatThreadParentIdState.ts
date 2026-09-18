import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// Which parent message has its inline reply list expanded. Only one thread is
// expanded at a time so the channel keeps a single reading position.
export const expandedChatThreadParentIdState = createAtomState<string | null>({
  key: 'expandedChatThreadParentIdState',
  defaultValue: null,
});
