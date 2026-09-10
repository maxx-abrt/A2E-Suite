import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const workbenchWidgetDockActiveWidgetIdState = createAtomState<string>({
  key: 'a2e-widgets-active',
  defaultValue: 'presence',
  localStorageOptions: { getOnInit: true },
});
