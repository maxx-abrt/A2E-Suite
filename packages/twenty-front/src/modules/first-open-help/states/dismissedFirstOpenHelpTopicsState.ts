import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { type DismissedFirstOpenHelpTopicsByUser } from '@/first-open-help/utils/dismissedFirstOpenHelpTopics';

export const dismissedFirstOpenHelpTopicsState =
  createAtomState<DismissedFirstOpenHelpTopicsByUser>({
    key: 'a2e-first-open-help-dismissed-topics',
    defaultValue: {},
    useLocalStorage: true,
    localStorageOptions: { getOnInit: true },
    validateInitFn: (payload) =>
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload),
  });
