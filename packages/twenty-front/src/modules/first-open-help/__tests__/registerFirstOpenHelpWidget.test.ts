import '@/first-open-help/registerFirstOpenHelpWidget';
import { getWorkbenchWidgetRegistrySnapshot } from '~/modules/workbench-dock/registry/workbenchWidgetRegistry';

describe('registerFirstOpenHelpWidget', () => {
  it('registers the help widget with the workbench dock registry', () => {
    const helpWidget = getWorkbenchWidgetRegistrySnapshot().find(
      (definition) => definition.id === 'help',
    );

    expect(helpWidget).toBeDefined();
    expect(helpWidget?.Component).toBeDefined();
    expect(helpWidget?.order).toBe(5);
  });
});
