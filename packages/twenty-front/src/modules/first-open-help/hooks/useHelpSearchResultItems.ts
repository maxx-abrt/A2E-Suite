import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { t } from '@lingui/core/macro';
import { AppPath } from 'twenty-shared/types';

import { type GroupableSearchResultItem } from '@/side-panel/pages/search/utils/groupSearchResultItems';

const HELP_GROUP_KEY = 'a2e-help';
const HELP_KEYWORDS_REGEX = /\b(aide|help|démarrage|start|onboard)/i;
const HELP_VIRTUAL_RECORD_ID = 'a2e-help-center';

// Cmd+K help entry — surfaces the home page when the user searches for any of
// the keywords above. The per-user dismissal and topic search behavior of
// FirstOpenHelpWidget remain accessible on the /home route itself.
export const useHelpSearchResultItems = ({
  searchInput,
}: {
  searchInput: string;
}): { helpSearchResultItems: GroupableSearchResultItem[] } => {
  const location = useLocation();

  const helpSearchResultItems = useMemo<GroupableSearchResultItem[]>(() => {
    const shouldShow =
      searchInput.trim() === '' || HELP_KEYWORDS_REGEX.test(searchInput);

    if (!shouldShow) {
      return [];
    }

    // Don't duplicate the entry when the user is already on the home page.
    if (location.pathname === AppPath.Home) {
      return [];
    }

    return [
      {
        id: 'a2e-help-open',
        label: t`Aide et démarrage`,
        objectNameSingular: HELP_GROUP_KEY,
        recordId: HELP_VIRTUAL_RECORD_ID,
        objectLabel: t`Aide`,
        avatarType: 'rounded',
        description: t`Conseils, raccourcis et ressources`,
        groupKey: HELP_GROUP_KEY,
        groupHeading: t`Aide`,
        path: AppPath.Home,
      } satisfies GroupableSearchResultItem,
    ];
  }, [searchInput, location.pathname]);

  return { helpSearchResultItems };
};
