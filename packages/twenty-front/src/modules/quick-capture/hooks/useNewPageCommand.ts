import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';
import { sidePanelSearchState } from '@/side-panel/states/sidePanelSearchState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { normalizeSearchText } from '~/utils/normalizeSearchText';

export const NEW_PAGE_COMMAND_ID = 'new-page';

export const useNewPageCommand = () => {
  const sidePanelSearch = useAtomStateValue(sidePanelSearchState);
  const isDocumentApplicationInstalled = useIsDocumentApplicationInstalled();

  const newPageCommandLabel = t`New page`;

  const shouldDisplayNewPageCommand =
    isDocumentApplicationInstalled &&
    normalizeSearchText(newPageCommandLabel).includes(
      normalizeSearchText(sidePanelSearch.trim()),
    );

  return {
    newPageCommandId: NEW_PAGE_COMMAND_ID,
    newPageCommandLabel,
    shouldDisplayNewPageCommand,
  };
};
