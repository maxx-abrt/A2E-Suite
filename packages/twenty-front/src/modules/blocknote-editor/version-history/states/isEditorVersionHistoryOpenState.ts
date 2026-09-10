import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const isEditorVersionHistoryOpenState = createAtomState<boolean>({
  key: 'a2e-editor-version-history-open',
  defaultValue: false,
  localStorageOptions: { getOnInit: true },
});
