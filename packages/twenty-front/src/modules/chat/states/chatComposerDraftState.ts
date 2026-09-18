import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const chatComposerDraftState = createAtomState<string>({
  key: 'chatComposerDraftState',
  defaultValue: '',
});
