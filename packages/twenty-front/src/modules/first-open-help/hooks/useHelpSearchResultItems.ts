import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { t } from '@lingui/core/macro';
import { AppPath } from 'twenty-shared/types';

import { type GroupableSearchResultItem } from '@/side-panel/pages/search/utils/groupSearchResultItems';

const HELP_GROUP_KEY = 'a2e-help';
const HELP_KEYWORDS_REGEX = /\b(aide|help|démarrage|start|onboard)/i;
const HELP_VIRTUAL_RECORD_ID = 'a2e-help-center';

// Help lives in a card on Home since the right dock was removed (D-Shell);
// this entry is how Cmd+K reaches it from anywhere else.
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
        label: t`Help and getting started`,
        objectNameSingular: HELP_GROUP_KEY,
        recordId: HELP_VIRTUAL_RECORD_ID,
        objectLabel: t`Help`,
        avatarType: 'rounded',
        description: t`Tips, shortcuts and resources`,
        groupKey: HELP_GROUP_KEY,
        groupHeading: t`Help`,
        path: AppPath.Home,
      } satisfies GroupableSearchResultItem,
    ];
  }, [searchInput, location.pathname]);

  return { helpSearchResultItems };
};
