import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const selectedChatChannelIdState = createAtomState<string | null>({
  key: 'selectedChatChannelIdState',
  defaultValue: null,
});
