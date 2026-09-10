import {
  groupSearchResultItems,
  type GroupableSearchResultItem,
} from '@/side-panel/pages/search/utils/groupSearchResultItems';

// Documents the P2.5 interaction-latency budget (< 150 ms on a 10k-record
// workspace) for the client-side part of the search pipeline: grouping and
// frecency-ordered folding. Network and database latency are server concerns
// measured separately; this locks the front budget.
const ITEM_COUNT = 10_000;
const GROUP_COUNT = 40;
const BUDGET_MILLISECONDS = 150;

const buildItems = (): GroupableSearchResultItem[] =>
  Array.from({ length: ITEM_COUNT }, (_, index) => ({
    id: `record-${index}`,
    label: `Record ${index}`,
    objectNameSingular: 'company',
    recordId: `record-${index}`,
    objectLabel: 'Company',
    avatarType: 'squared' as const,
    groupKey: `group-${index % GROUP_COUNT}`,
    groupHeading: `Group ${index % GROUP_COUNT}`,
  }));

describe('groupSearchResultItems performance budget', () => {
  it('groups and frecency-orders 10k items under 150 ms', () => {
    const items = buildItems();
    const frecencyRankByGroupKey = Object.fromEntries(
      Array.from({ length: GROUP_COUNT }, (_, index) => [
        `group-${index}`,
        index / GROUP_COUNT,
      ]),
    );

    // One warm-up round so JIT noise does not pollute the measured run.
    groupSearchResultItems({ items, frecencyRankByGroupKey });

    const startedAt = performance.now();
    const { groups, orderedItems } = groupSearchResultItems({
      items,
      frecencyRankByGroupKey,
    });
    const elapsedMilliseconds = performance.now() - startedAt;

    expect(groups).toHaveLength(GROUP_COUNT);
    expect(orderedItems).toHaveLength(ITEM_COUNT);
    expect(elapsedMilliseconds).toBeLessThan(BUDGET_MILLISECONDS);
  });
});
