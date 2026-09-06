import { isDefined } from 'twenty-shared/utils';

import { type SearchResultItem } from '@/side-panel/pages/search/hooks/useSidePanelSearchRecords';

export type SearchResultGroup = {
  groupKey: string;
  heading: string;
  items: GroupableSearchResultItem[];
};

export type GroupableSearchResultItem = SearchResultItem & {
  groupKey: string;
  groupHeading: string;
  // Present on app-provider results only: server-resolved deep link opened
  // through the router instead of the standard record page navigation.
  path?: string;
};

// Sorts by frecency rank (stable: equal ranks keep the server's relevance
// order) then folds items into per-group buckets in that sorted order.
export const groupSearchResultItems = ({
  items,
  frecencyRankByGroupKey,
}: {
  items: GroupableSearchResultItem[];
  frecencyRankByGroupKey: Record<string, number>;
}): {
  groups: SearchResultGroup[];
  orderedItems: GroupableSearchResultItem[];
} => {
  const rankOf = (item: GroupableSearchResultItem) =>
    frecencyRankByGroupKey[item.groupKey] ?? 0;

  const orderedItems = [...items].sort(
    (itemA, itemB) => rankOf(itemB) - rankOf(itemA),
  );

  const groups: SearchResultGroup[] = [];
  const groupByGroupKey = new Map<string, SearchResultGroup>();

  for (const item of orderedItems) {
    const existingGroup = groupByGroupKey.get(item.groupKey);

    if (isDefined(existingGroup)) {
      existingGroup.items.push(item);
      continue;
    }

    const newGroup: SearchResultGroup = {
      groupKey: item.groupKey,
      heading: item.groupHeading,
      items: [item],
    };

    groupByGroupKey.set(item.groupKey, newGroup);
    groups.push(newGroup);
  }

  return { groups, orderedItems };
};
