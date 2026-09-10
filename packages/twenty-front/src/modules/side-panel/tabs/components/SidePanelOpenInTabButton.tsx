import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import { activeSidePanelTabIdState } from '@/side-panel/tabs/states/activeSidePanelTabIdState';
import { useSidePanelTabs } from '@/side-panel/tabs/hooks/useSidePanelTabs';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { SidePanelPages } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconAppWindow } from 'twenty-ui/icon';
import { IconButtonWithTooltip } from 'twenty-ui/input';

/**
 * Explicit, discoverable counterpart to middle-click: promotes the context
 * currently shown in the panel into a tab that survives navigation and reload.
 */
export const SidePanelOpenInTabButton = () => {
  const { t } = useLingui();
  const sidePanelNavigationStack = useAtomStateValue(
    sidePanelNavigationStackState,
  );
  const activeSidePanelTabId = useAtomStateValue(activeSidePanelTabIdState);
  const { adoptNavigationStackAsSidePanelTab } = useSidePanelTabs();

  const currentItem = sidePanelNavigationStack.at(-1);

  const canOpenInTab =
    !isDefined(activeSidePanelTabId) &&
    isDefined(currentItem) &&
    currentItem.page !== SidePanelPages.CommandMenuDisplay;

  if (!canOpenInTab) {
    return null;
  }

  const openInTabLabel = t`Open in tab`;

  return (
    <span data-testid="side-panel-open-in-tab-button">
      <IconButtonWithTooltip
        tooltipContent={openInTabLabel}
        Icon={IconAppWindow}
        size="small"
        variant="tertiary"
        onClick={adoptNavigationStackAsSidePanelTab}
        ariaLabel={openInTabLabel}
      />
    </span>
  );
};
