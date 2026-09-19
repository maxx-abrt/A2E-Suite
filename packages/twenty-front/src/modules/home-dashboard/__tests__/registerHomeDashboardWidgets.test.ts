import { registerHomeDashboardWidgets } from '@/home-dashboard/registerHomeDashboardWidgets';
import { getWorkbenchWidgetRegistrySnapshot } from '~/modules/workbench-dock/registry/workbenchWidgetRegistry';

const HOME_WIDGET_IDS = [
  'tasks',
  'events',
  'activity',
  'focus',
  'contributions',
];

describe('registerHomeDashboardWidgets', () => {
  it('registers the five Home widgets with their components on import', () => {
    const definitions = getWorkbenchWidgetRegistrySnapshot();

    for (const widgetId of HOME_WIDGET_IDS) {
      const definition = definitions.find(({ id }) => id === widgetId);

      expect(definition).toBeDefined();
      expect(definition?.Component).toBeDefined();
    }
  });

  it('does not duplicate definitions when called again', () => {
    registerHomeDashboardWidgets();

    expect(
      getWorkbenchWidgetRegistrySnapshot().filter(({ id }) =>
        HOME_WIDGET_IDS.includes(id),
      ),
    ).toHaveLength(HOME_WIDGET_IDS.length);
  });

  it('unregisters cleanly', () => {
    const unregister = registerHomeDashboardWidgets();

    unregister();

    const remainingIds = getWorkbenchWidgetRegistrySnapshot().map(
      ({ id }) => id,
    );

    expect(remainingIds).not.toContain('events');
    expect(remainingIds).not.toContain('contributions');
  });
});
