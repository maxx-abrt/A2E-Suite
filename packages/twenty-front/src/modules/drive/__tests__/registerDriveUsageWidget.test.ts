import {
  DRIVE_USAGE_WIDGET_ID,
  registerDriveUsageWidget,
} from '@/drive/registerDriveUsageWidget';
import { getWorkbenchWidgetRegistrySnapshot } from '~/modules/workbench-dock/registry/workbenchWidgetRegistry';

describe('registerDriveUsageWidget', () => {
  it('registers the widget with a component on import', () => {
    const definition = getWorkbenchWidgetRegistrySnapshot().find(
      ({ id }) => id === DRIVE_USAGE_WIDGET_ID,
    );

    expect(definition).toBeDefined();
    expect(definition?.Component).toBeDefined();
  });

  it('does not duplicate and unregisters cleanly', () => {
    registerDriveUsageWidget();

    expect(
      getWorkbenchWidgetRegistrySnapshot().filter(
        ({ id }) => id === DRIVE_USAGE_WIDGET_ID,
      ),
    ).toHaveLength(1);

    const unregister = registerDriveUsageWidget();

    unregister();

    expect(
      getWorkbenchWidgetRegistrySnapshot().map(({ id }) => id),
    ).not.toContain(DRIVE_USAGE_WIDGET_ID);
  });
});
