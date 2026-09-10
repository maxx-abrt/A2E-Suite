import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const isEditorOutlineOpenState = createAtomState<boolean>({
  key: 'a2e-editor-outline-open',
  defaultValue: false,
  localStorageOptions: { getOnInit: true },
});
