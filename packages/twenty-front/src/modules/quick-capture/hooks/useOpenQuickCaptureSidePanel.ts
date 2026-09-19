import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { t } from '@lingui/core/macro';
import { SidePanelPages } from 'twenty-shared/types';
import { IconNotes } from 'twenty-ui/icon';

export const useOpenQuickCaptureSidePanel = () => {
  const { navigateSidePanelMenu } = useSidePanelMenu();

  const openQuickCaptureSidePanel = () => {
    navigateSidePanelMenu({
      page: SidePanelPages.QuickCapture,
      pageTitle: t`Quick capture`,
      pageIcon: IconNotes,
      resetNavigationStack: true,
    });
  };

  return { openQuickCaptureSidePanel };
};
