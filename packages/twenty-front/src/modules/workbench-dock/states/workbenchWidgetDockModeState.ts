import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export type WorkbenchWidgetDockMode = 'MINI' | 'EXPANDED';

export const workbenchWidgetDockModeState =
  createAtomState<WorkbenchWidgetDockMode>({
    key: 'a2e-widgets-mode',
    defaultValue: 'MINI',
    localStorageOptions: { getOnInit: true },
  });
