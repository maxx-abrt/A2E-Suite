import { type SidePanelTab } from '@/side-panel/tabs/types/SidePanelTab';
import { applySidePanelTabsLruLimit } from '@/side-panel/tabs/utils/applySidePanelTabsLruLimit';
import { getSidePanelTabIdAfterClose } from '@/side-panel/tabs/utils/getSidePanelTabIdAfterClose';

const buildTab = (id: string, updatedAt: number): SidePanelTab => ({
  id,
  title: id,
  stack: [
    {
      pageId: `page-${id}`,
      page: 'command-menu-display' as SidePanelTab['stack'][number]['page'],
      pageTitle: id,
    },
  ],
  activePageId: `page-${id}`,
  createdAt: updatedAt,
  updatedAt,
});

describe('getSidePanelTabIdAfterClose', () => {
  const tabs = [buildTab('a', 1), buildTab('b', 2), buildTab('c', 3)];

  it('selects the right neighbor', () => {
    expect(getSidePanelTabIdAfterClose({ tabs, closedTabId: 'b' })).toBe('c');
  });

  it('falls back to the left neighbor for the last tab', () => {
    expect(getSidePanelTabIdAfterClose({ tabs, closedTabId: 'c' })).toBe('b');
  });

  it('selects the new first tab when the first one is closed', () => {
    expect(getSidePanelTabIdAfterClose({ tabs, closedTabId: 'a' })).toBe('b');
  });

  it('returns null when the last remaining tab is closed', () => {
    expect(
      getSidePanelTabIdAfterClose({
        tabs: [buildTab('only', 1)],
        closedTabId: 'only',
      }),
    ).toBeNull();
  });

  it('returns null for an unknown tab', () => {
    expect(
      getSidePanelTabIdAfterClose({ tabs, closedTabId: 'zzz' }),
    ).toBeNull();
  });
});

describe('applySidePanelTabsLruLimit', () => {
  it('keeps every tab under the limit', () => {
    const tabs = [buildTab('a', 1), buildTab('b', 2)];

    expect(
      applySidePanelTabsLruLimit({ tabs, activeTabId: 'a', maxCount: 3 }),
    ).toEqual({ tabs, evictedTabs: [] });
  });

  it('evicts the least recently used tab', () => {
    const tabs = [buildTab('a', 1), buildTab('b', 5), buildTab('c', 9)];

    const result = applySidePanelTabsLruLimit({
      tabs,
      activeTabId: 'c',
      maxCount: 2,
    });

    expect(result.tabs.map((tab) => tab.id)).toEqual(['b', 'c']);
    expect(result.evictedTabs.map((tab) => tab.id)).toEqual(['a']);
  });

  it('never evicts the active tab', () => {
    const tabs = [buildTab('a', 1), buildTab('b', 5), buildTab('c', 9)];

    const result = applySidePanelTabsLruLimit({
      tabs,
      activeTabId: 'a',
      maxCount: 2,
    });

    expect(result.tabs.map((tab) => tab.id)).toEqual(['a', 'c']);
    expect(result.evictedTabs.map((tab) => tab.id)).toEqual(['b']);
  });

  it('preserves the original order of the surviving tabs', () => {
    const tabs = [buildTab('a', 9), buildTab('b', 1), buildTab('c', 5)];

    const result = applySidePanelTabsLruLimit({
      tabs,
      activeTabId: 'a',
      maxCount: 2,
    });

    expect(result.tabs.map((tab) => tab.id)).toEqual(['a', 'c']);
  });
});
