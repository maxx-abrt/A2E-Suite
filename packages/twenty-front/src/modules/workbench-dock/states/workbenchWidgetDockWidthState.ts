import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const workbenchWidgetDockWidthState = createAtomState<number>({
  key: 'a2e-widgets-width',
  defaultValue: 336,
  localStorageOptions: { getOnInit: true },
});
