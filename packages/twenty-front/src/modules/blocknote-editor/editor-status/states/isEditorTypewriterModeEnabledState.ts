import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const isEditorTypewriterModeEnabledState = createAtomState<boolean>({
  key: 'a2e-editor-typewriter-mode',
  defaultValue: false,
  localStorageOptions: { getOnInit: true },
});
