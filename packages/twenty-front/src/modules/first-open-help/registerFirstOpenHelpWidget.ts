import { IconHelpCircle } from 'twenty-ui/icon';

import { FirstOpenHelpWidget } from '@/first-open-help/components/FirstOpenHelpWidget';
import { registerWorkbenchWidget } from '~/modules/workbench-dock/registry/workbenchWidgetRegistry';

let unregisterFirstOpenHelpWidget: (() => void) | null = null;

export const registerFirstOpenHelpWidget = (): (() => void) => {
  if (unregisterFirstOpenHelpWidget !== null) {
    return unregisterFirstOpenHelpWidget;
  }

  const unregisterWidget = registerWorkbenchWidget({
    id: 'help',
    Icon: IconHelpCircle,
    Component: FirstOpenHelpWidget,
    order: 5,
  });

  unregisterFirstOpenHelpWidget = () => {
    unregisterWidget();
    unregisterFirstOpenHelpWidget = null;
  };

  return unregisterFirstOpenHelpWidget;
};

registerFirstOpenHelpWidget();
