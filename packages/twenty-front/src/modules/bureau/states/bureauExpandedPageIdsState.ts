import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// Expanded branches of the Bureau page tree, kept across reloads.
export const bureauExpandedPageIdsState = createAtomState<string[]>({
  key: 'bureauExpandedPageIdsState',
  defaultValue: [],
  useLocalStorage: true,
});
