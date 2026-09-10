import { useSyncExternalStore } from 'react';

import {
  getWorkbenchWidgetRegistrySnapshot,
  subscribeToWorkbenchWidgetRegistry,
} from '~/modules/workbench-dock/registry/workbenchWidgetRegistry';

export const useWorkbenchWidgetRegistry = () =>
  useSyncExternalStore(
    subscribeToWorkbenchWidgetRegistry,
    getWorkbenchWidgetRegistrySnapshot,
    getWorkbenchWidgetRegistrySnapshot,
  );
