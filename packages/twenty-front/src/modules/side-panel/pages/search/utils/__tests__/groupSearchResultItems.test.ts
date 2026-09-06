import {
  groupSearchResultItems,
  type GroupableSearchResultItem,
} from '@/side-panel/pages/search/utils/groupSearchResultItems';

const buildItem = (
  id: string,
  groupKey: string,
  groupHeading: string,
): GroupableSearchResultItem => ({
  id,
  label: `label-${id}`,
  objectNameSingular: groupKey,
  recordId: id,
  objectLabel: groupHeading,
  groupKey,
  groupHeading,
  avatarType: 'rounded',
});

describe('groupSearchResultItems', () => {
  it('sorts groups by descending frecency rank', () => {
    const { groups } = groupSearchResultItems({
      items: [
        buildItem('1', 'company', 'Company'),
        buildItem('2', 'person', 'Person'),
      ],
      frecencyRankByGroupKey: { company: 1, person: 5 },
    });

    expect(groups.map(({ groupKey }) => groupKey)).toEqual([
      'person',
      'company',
    ]);
  });

  it('keeps server relevance order inside a group', () => {
    const { groups } = groupSearchResultItems({
      items: [
        buildItem('1', 'company', 'Company'),
        buildItem('2', 'company', 'Company'),
        buildItem('3', 'company', 'Company'),
      ],
      frecencyRankByGroupKey: { company: 3 },
    });

    expect(groups[0].items.map(({ id }) => id)).toEqual(['1', '2', '3']);
  });

  it('places groups without frecency data last, in input order', () => {
    const { groups } = groupSearchResultItems({
      items: [
        buildItem('1', 'company', 'Company'),
        buildItem('2', 'task', 'Task'),
        buildItem('3', 'person', 'Person'),
      ],
      frecencyRankByGroupKey: { person: 1 },
    });

    expect(groups.map(({ groupKey }) => groupKey)).toEqual([
      'person',
      'company',
      'task',
    ]);
  });

  it('returns orderedItems matching the flattened group order', () => {
    const { groups, orderedItems } = groupSearchResultItems({
      items: [
        buildItem('1', 'company', 'Company'),
        buildItem('2', 'person', 'Person'),
        buildItem('3', 'company', 'Company'),
      ],
      frecencyRankByGroupKey: { company: 4, person: 0 },
    });

    expect(orderedItems.map(({ id }) => id)).toEqual(['1', '3', '2']);
    expect(groups.map(({ heading }) => heading)).toEqual(['Company', 'Person']);
  });
});
