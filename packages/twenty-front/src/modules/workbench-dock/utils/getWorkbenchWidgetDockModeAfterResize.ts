import { type WorkbenchWidgetDockMode } from '~/modules/workbench-dock/states/workbenchWidgetDockModeState';

export const WORKBENCH_DOCK_MIN_WIDTH = 280;
export const WORKBENCH_DOCK_MAX_WIDTH = 460;
export const WORKBENCH_DOCK_SNAP_THRESHOLD = 12;

export const getWorkbenchWidgetDockModeAfterResize = (
  width: number,
): WorkbenchWidgetDockMode =>
  width <= WORKBENCH_DOCK_MIN_WIDTH + WORKBENCH_DOCK_SNAP_THRESHOLD
    ? 'MINI'
    : 'EXPANDED';
