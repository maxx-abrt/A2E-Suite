import { sidePanelSearchState } from '@/side-panel/states/sidePanelSearchState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { normalizeSearchText } from '~/utils/normalizeSearchText';

export const TEMPLATES_COMMAND_ID = 'templates';

export const useTemplatesCommand = () => {
  const sidePanelSearch = useAtomStateValue(sidePanelSearchState);

  const templatesCommandLabel = t`Templates`;

  const shouldDisplayTemplatesCommand = normalizeSearchText(
    templatesCommandLabel,
  ).includes(normalizeSearchText(sidePanelSearch.trim()));

  return {
    templatesCommandId: TEMPLATES_COMMAND_ID,
    templatesCommandLabel,
    shouldDisplayTemplatesCommand,
  };
};
