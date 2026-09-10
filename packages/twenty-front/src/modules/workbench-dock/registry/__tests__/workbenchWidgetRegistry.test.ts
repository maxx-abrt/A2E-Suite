import {
  type WorkbenchWidgetDefinition,
  getWorkbenchWidgetRegistrySnapshot,
  registerWorkbenchWidget,
} from '~/modules/workbench-dock/registry/workbenchWidgetRegistry';
import { IconBolt } from 'twenty-ui/icon';

const customDefinition: WorkbenchWidgetDefinition = {
  id: 'custom-test-widget',
  Icon: IconBolt,
  order: 15,
};

describe('workbenchWidgetRegistry', () => {
  it('ships the six core widget extension points in stable order', () => {
    expect(getWorkbenchWidgetRegistrySnapshot().map(({ id }) => id)).toEqual([
      'inbox',
      'assistant',
      'comments',
      'tasks',
      'activity',
      'presence',
    ]);
  });

  it('registers and cleanly unregisters app widgets', () => {
    const unregister = registerWorkbenchWidget(customDefinition);

    expect(getWorkbenchWidgetRegistrySnapshot().map(({ id }) => id)).toContain(
      customDefinition.id,
    );

    unregister();

    expect(
      getWorkbenchWidgetRegistrySnapshot().map(({ id }) => id),
    ).not.toContain(customDefinition.id);
  });
});
