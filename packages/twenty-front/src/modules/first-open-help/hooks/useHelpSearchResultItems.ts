import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { AppPath } from 'twenty-shared/types';

import {
  A2E_HELP_DOC_PAGES,
  type A2eHelpDocPageKey,
  getA2eHelpDocUrl,
} from '@/a2e-help/constants/A2eHelpDocPages';
import { type GroupableSearchResultItem } from '@/side-panel/pages/search/utils/groupSearchResultItems';

const HELP_GROUP_KEY = 'a2e-help';
const HELP_KEYWORDS_REGEX = /\b(aide|help|démarrage|start|onboard)/i;
const HELP_VIRTUAL_RECORD_ID = 'a2e-help-center';
const HELP_LABEL = msg`Help`;
const HELP_OPEN_LABEL = msg`Help and getting started`;
const HELP_OPEN_DESCRIPTION = msg`Tips, shortcuts and resources`;

// Cmd+K groups every help entry under "Help" and prefixes its label with
// "Help:" (M12g) so a doc result is recognisable at a glance. The topics are
// the shipped a2e-suite pages; a page added to the constants automatically
// becomes a searchable entry.
const HELP_DOC_TOPIC_KEYS: A2eHelpDocPageKey[] = [
  'gettingStarted',
  'bureau',
  'agenda',
  'bilan',
  'syna',
  'archive',
  'templates',
  'workingAcrossApps',
  'faqTroubleshooting',
];

// Help lives in a card on Home since the right dock was removed (D-Shell);
// this entry is how Cmd+K reaches it from anywhere else.
export const useHelpSearchResultItems = ({
  searchInput,
}: {
  searchInput: string;
}): { helpSearchResultItems: GroupableSearchResultItem[] } => {
  const location = useLocation();
  const { i18n } = useLingui();

  const helpSearchResultItems = useMemo<GroupableSearchResultItem[]>(() => {
    const isHomePage = location.pathname === AppPath.Home;
    const trimmedSearch = searchInput.trim();
    const shouldShowHomeEntry =
      !isHomePage &&
      (trimmedSearch === '' || HELP_KEYWORDS_REGEX.test(trimmedSearch));

    const helpLabel = i18n._(HELP_LABEL);
    const homeEntries: GroupableSearchResultItem[] = shouldShowHomeEntry
      ? [
          {
            id: 'a2e-help-open',
            label: i18n._(HELP_OPEN_LABEL),
            objectNameSingular: HELP_GROUP_KEY,
            recordId: HELP_VIRTUAL_RECORD_ID,
            objectLabel: helpLabel,
            avatarType: 'rounded',
            description: i18n._(HELP_OPEN_DESCRIPTION),
            groupKey: HELP_GROUP_KEY,
            groupHeading: helpLabel,
            path: AppPath.Home,
          },
        ]
      : [];

    const docEntries: GroupableSearchResultItem[] = HELP_DOC_TOPIC_KEYS.map(
      (docPageKey) => {
        const docPage = A2E_HELP_DOC_PAGES[docPageKey];

        return {
          id: `a2e-help-doc-${docPageKey}`,
          label: `${helpLabel}: ${i18n._(docPage.label)}`,
          objectNameSingular: HELP_GROUP_KEY,
          recordId: docPageKey,
          objectLabel: helpLabel,
          avatarType: 'rounded',
          description: docPage.slug,
          groupKey: HELP_GROUP_KEY,
          groupHeading: helpLabel,
          externalUrl: getA2eHelpDocUrl(docPageKey),
        } satisfies GroupableSearchResultItem;
      },
    );

    return [...homeEntries, ...docEntries];
  }, [searchInput, location.pathname, i18n]);

  return { helpSearchResultItems };
};
