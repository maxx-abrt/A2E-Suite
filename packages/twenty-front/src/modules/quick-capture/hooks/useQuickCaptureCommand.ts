import { sidePanelSearchState } from '@/side-panel/states/sidePanelSearchState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { normalizeSearchText } from '~/utils/normalizeSearchText';

export const QUICK_CAPTURE_COMMAND_ID = 'quick-capture';

export const useQuickCaptureCommand = () => {
  const sidePanelSearch = useAtomStateValue(sidePanelSearchState);

  const quickCaptureCommandLabel = t`Quick capture`;

  const shouldDisplayQuickCaptureCommand = normalizeSearchText(
    quickCaptureCommandLabel,
  ).includes(normalizeSearchText(sidePanelSearch.trim()));

  return {
    quickCaptureCommandId: QUICK_CAPTURE_COMMAND_ID,
    quickCaptureCommandLabel,
    shouldDisplayQuickCaptureCommand,
  };
};
