import { IconChartPie } from 'twenty-ui/icon';

import { DriveUsageWidget } from '@/drive/components/DriveUsageWidget';
import { registerWorkbenchWidget } from '~/modules/workbench-dock/registry/workbenchWidgetRegistry';

// The Drive usage widget extends the P2.4 workbench dock registry by adding a
// new id, exactly like the Home dashboard widgets. It is imported for its side
// effect by the dock; the registry's own snapshot stays the six core widgets.
export const DRIVE_USAGE_WIDGET_ID = 'drive-usage';

let unregisterDriveUsageWidget: (() => void) | null = null;

export const registerDriveUsageWidget = (): (() => void) => {
  if (unregisterDriveUsageWidget !== null) {
    return unregisterDriveUsageWidget;
  }

  const unregister = registerWorkbenchWidget({
    id: DRIVE_USAGE_WIDGET_ID,
    Icon: IconChartPie,
    Component: DriveUsageWidget,
    order: 65,
  });

  unregisterDriveUsageWidget = () => {
    unregister();
    unregisterDriveUsageWidget = null;
  };

  return unregisterDriveUsageWidget;
};

registerDriveUsageWidget();
