import {
  getWorkbenchWidgetDockModeAfterResize,
  WORKBENCH_DOCK_MIN_WIDTH,
  WORKBENCH_DOCK_SNAP_THRESHOLD,
} from '~/modules/workbench-dock/utils/getWorkbenchWidgetDockModeAfterResize';

describe('getWorkbenchWidgetDockModeAfterResize', () => {
  it('snaps to MINI through the 12px collapse boundary', () => {
    expect(
      getWorkbenchWidgetDockModeAfterResize(
        WORKBENCH_DOCK_MIN_WIDTH + WORKBENCH_DOCK_SNAP_THRESHOLD,
      ),
    ).toBe('MINI');
  });

  it('stays EXPANDED beyond the collapse boundary', () => {
    expect(
      getWorkbenchWidgetDockModeAfterResize(
        WORKBENCH_DOCK_MIN_WIDTH + WORKBENCH_DOCK_SNAP_THRESHOLD + 1,
      ),
    ).toBe('EXPANDED');
  });
});
