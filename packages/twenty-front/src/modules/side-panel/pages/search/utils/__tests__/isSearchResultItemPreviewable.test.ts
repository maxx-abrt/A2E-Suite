import {
  isSearchResultItemPreviewable,
} from '@/side-panel/pages/search/utils/isSearchResultItemPreviewable';

const buildItem = (objectNameSingular: string) =>
  ({
    id: `item-${objectNameSingular}`,
    label: 'Item',
    objectNameSingular,
    recordId: 'record-1',
    objectLabel: 'Label',
    avatarType: 'rounded',
    groupKey: 'group',
    groupHeading: 'Group',
  }) as unknown as Parameters<typeof isSearchResultItemPreviewable>[0];

describe('isSearchResultItemPreviewable', () => {
  const installed = new Set(['company', 'person']);

  it('is false for a null item', () => {
    expect(isSearchResultItemPreviewable(null, installed)).toBe(false);
  });

  it('is false for a virtual item whose object is not installed', () => {
    expect(
      isSearchResultItemPreviewable(buildItem('a2e-help'), installed),
    ).toBe(false);
  });

  it('is true for an item backed by an installed object', () => {
    expect(
      isSearchResultItemPreviewable(buildItem('company'), installed),
    ).toBe(true);
  });
});
