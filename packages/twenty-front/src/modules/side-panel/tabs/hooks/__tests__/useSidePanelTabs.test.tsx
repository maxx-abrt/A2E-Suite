import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { ContextStoreViewType } from '@/context-store/types/ContextStoreViewType';
import { SIDE_PANEL_COMPONENT_INSTANCE_ID } from '@/side-panel/constants/SidePanelComponentInstanceId';
import {
  type SidePanelNavigationStackItem,
  type SidePanelNavigationTarget,
  sidePanelNavigationStackState,
} from '@/side-panel/states/sidePanelNavigationStackState';
import { isSidePanelOpenedState } from '@/side-panel/states/isSidePanelOpenedState';
import { useSidePanelTabs } from '@/side-panel/tabs/hooks/useSidePanelTabs';
import { activeSidePanelTabIdState } from '@/side-panel/tabs/states/activeSidePanelTabIdState';
import {
  EMPTY_SIDE_PANEL_TABS_SESSION,
  SIDE_PANEL_TABS_STORAGE_KEY,
  sidePanelTabsState,
} from '@/side-panel/tabs/states/sidePanelTabsState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { SidePanelPages } from 'twenty-shared/types';
import { Icon123 } from 'twenty-ui/icon';
import { getJestMetadataAndApolloMocksAndCommandMenuWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksAndCommandMenuWrapper';

const wrapper = getJestMetadataAndApolloMocksAndCommandMenuWrapper({
  apolloMocks: [],
  componentInstanceId: SIDE_PANEL_COMPONENT_INSTANCE_ID,
  contextStoreCurrentObjectMetadataNameSingular: 'person',
  contextStoreCurrentViewId: 'my-view-id',
  contextStoreTargetedRecordsRule: {
    mode: 'selection',
    selectedRecordIds: [],
  },
  contextStoreNumberOfSelectedRecords: 0,
  contextStoreCurrentViewType: ContextStoreViewType.Table,
});

const buildRoutedTarget = ({
  path,
  title,
  pageId,
}: {
  path: string;
  title: string;
  pageId: string;
}): SidePanelNavigationTarget => ({
  page: SidePanelPages.RoutedPage,
  pageTitle: title,
  pageIcon: Icon123,
  pageId,
  routedFlowStateScopeId: `scope-${pageId}`,
  routedLocation: {
    pathname: path,
    search: '',
    hash: '',
    state: null,
    key: `key-${pageId}`,
  },
});

const renderTabsHook = () => renderHook(() => useSidePanelTabs(), { wrapper });

const getNavigationStack = () =>
  jotaiStore.get(sidePanelNavigationStackState.atom);

const getTabs = () => jotaiStore.get(sidePanelTabsState.atom).tabs;

const getActiveTabId = () => jotaiStore.get(activeSidePanelTabIdState.atom);

describe('useSidePanelTabs', () => {
  beforeEach(() => {
    localStorage.clear();
    jotaiStore.set(sidePanelTabsState.atom, EMPTY_SIDE_PANEL_TABS_SESSION);
    jotaiStore.set(activeSidePanelTabIdState.atom, null);
    jotaiStore.set(sidePanelNavigationStackState.atom, []);
    jotaiStore.set(isSidePanelOpenedState.atom, false);
  });

  it('creates a first tab and makes its context live', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });

    expect(getTabs()).toHaveLength(1);
    expect(getTabs()[0]?.title).toBe('Airbnb');
    expect(getTabs()[0]?.contextKey).toBe('route:/object/company/1');
    expect(getActiveTabId()).toBe(getTabs()[0]?.id);
    expect(getNavigationStack()).toHaveLength(1);
    expect(getNavigationStack()[0]?.pageId).toBe('page-1');
    expect(jotaiStore.get(isSidePanelOpenedState.atom)).toBe(true);
  });

  it('stores no React component in the persisted payload', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });

    const persistedPayload = localStorage.getItem(SIDE_PANEL_TABS_STORAGE_KEY);

    expect(persistedPayload).not.toBeNull();
    expect(persistedPayload).not.toContain('pageIcon"');
    expect(() => JSON.parse(persistedPayload ?? 'null')).not.toThrow();
  });

  it('appends a second tab, keeps the order and activates the new one', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });
    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/2',
          title: 'Qonto',
          pageId: 'page-2',
        }),
      });
    });

    expect(getTabs().map((tab) => tab.title)).toEqual(['Airbnb', 'Qonto']);
    expect(getActiveTabId()).toBe(getTabs()[1]?.id);
    expect(getNavigationStack()[0]?.pageId).toBe('page-2');
  });

  it('switches back to a tab and restores its stack atomically', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });
    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/2',
          title: 'Qonto',
          pageId: 'page-2',
        }),
      });
    });

    const firstTabId = getTabs()[0]?.id ?? '';

    act(() => {
      result.current.activateSidePanelTab(firstTabId);
    });

    expect(getActiveTabId()).toBe(firstTabId);
    expect(getNavigationStack()).toHaveLength(1);
    expect(getNavigationStack()[0]?.pageId).toBe('page-1');
    expect(getNavigationStack()[0]?.pageIcon).toBeDefined();
  });

  it('preserves the deep stack of a tab across a switch', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });

    // Simulates in-tab navigation pushing a second entry on the live stack.
    act(() => {
      jotaiStore.set(sidePanelNavigationStackState.atom, [
        ...getNavigationStack(),
        {
          ...buildRoutedTarget({
            path: '/object/person/9',
            title: 'Sylvie Palmer',
            pageId: 'page-1-child',
          }),
          pageId: 'page-1-child',
        } as SidePanelNavigationStackItem,
      ]);
    });
    act(() => {
      result.current.syncActiveTabFromNavigationStack();
    });

    const firstTabId = getTabs()[0]?.id ?? '';

    expect(getTabs()[0]?.stack).toHaveLength(2);
    expect(getTabs()[0]?.title).toBe('Sylvie Palmer');

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/2',
          title: 'Qonto',
          pageId: 'page-2',
        }),
      });
    });
    act(() => {
      result.current.activateSidePanelTab(firstTabId);
    });

    expect(getNavigationStack().map((item) => item.pageId)).toEqual([
      'page-1',
      'page-1-child',
    ]);
  });

  it('focuses the existing tab instead of duplicating a context', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });
    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/2',
          title: 'Qonto',
          pageId: 'page-2',
        }),
      });
    });

    const firstTabId = getTabs()[0]?.id ?? '';

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1-again',
        }),
      });
    });

    expect(getTabs()).toHaveLength(2);
    expect(getActiveTabId()).toBe(firstTabId);
    expect(getNavigationStack()[0]?.pageId).toBe('page-1');
  });

  it('closing a non-active tab leaves the live context untouched', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });
    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/2',
          title: 'Qonto',
          pageId: 'page-2',
        }),
      });
    });

    const firstTabId = getTabs()[0]?.id ?? '';
    const secondTabId = getTabs()[1]?.id ?? '';

    act(() => {
      result.current.closeSidePanelTab(firstTabId);
    });

    expect(getTabs().map((tab) => tab.id)).toEqual([secondTabId]);
    expect(getActiveTabId()).toBe(secondTabId);
    expect(getNavigationStack()[0]?.pageId).toBe('page-2');
  });

  it('closing the active tab activates its neighbor', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });
    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/2',
          title: 'Qonto',
          pageId: 'page-2',
        }),
      });
    });

    const firstTabId = getTabs()[0]?.id ?? '';
    const secondTabId = getTabs()[1]?.id ?? '';

    act(() => {
      result.current.closeSidePanelTab(secondTabId);
    });

    expect(getTabs().map((tab) => tab.id)).toEqual([firstTabId]);
    expect(getActiveTabId()).toBe(firstTabId);
    expect(getNavigationStack()[0]?.pageId).toBe('page-1');
  });

  it('closing the last tab clears the session and closes the panel', async () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });

    const onlyTabId = getTabs()[0]?.id ?? '';

    await act(async () => {
      result.current.closeSidePanelTab(onlyTabId);
    });

    expect(getTabs()).toEqual([]);
    expect(getActiveTabId()).toBeNull();
    expect(jotaiStore.get(isSidePanelOpenedState.atom)).toBe(false);
  });

  it('restores the persisted session after a reload', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });

    const persistedSession = jotaiStore.get(sidePanelTabsState.atom);
    const persistedActiveTabId = getActiveTabId();

    // Simulates a page reload: the live surface is gone, storage is not.
    act(() => {
      jotaiStore.set(sidePanelNavigationStackState.atom, []);
      jotaiStore.set(isSidePanelOpenedState.atom, false);
    });

    expect(persistedSession.tabs).toHaveLength(1);

    act(() => {
      result.current.restoreSidePanelTabsSession({ routedPathInUrl: null });
    });

    expect(getActiveTabId()).toBe(persistedActiveTabId);
    expect(getNavigationStack()[0]?.pageId).toBe('page-1');
    expect(jotaiStore.get(isSidePanelOpenedState.atom)).toBe(true);
  });

  it('lets the URL win over the persisted selection on reload', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });

    act(() => {
      jotaiStore.set(sidePanelNavigationStackState.atom, []);
    });

    act(() => {
      result.current.restoreSidePanelTabsSession({
        routedPathInUrl: '/object/company/404',
      });
    });

    expect(getTabs()).toHaveLength(1);
    expect(getActiveTabId()).toBeNull();
    expect(getNavigationStack()).toEqual([]);
  });

  it('aligns the selection with the matching tab when the URL projects one', () => {
    const { result } = renderTabsHook();

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/1',
          title: 'Airbnb',
          pageId: 'page-1',
        }),
      });
    });

    const tabId = getTabs()[0]?.id ?? '';

    act(() => {
      jotaiStore.set(activeSidePanelTabIdState.atom, null);
    });

    act(() => {
      result.current.restoreSidePanelTabsSession({
        routedPathInUrl: '/object/company/1',
      });
    });

    expect(getActiveTabId()).toBe(tabId);
  });

  it('silently drops a session written by another schema version', () => {
    const { result } = renderTabsHook();

    act(() => {
      jotaiStore.set(sidePanelTabsState.atom, {
        version: 999,
        tabs: [
          {
            id: 'stale-tab',
            title: 'Stale',
            stack: [
              {
                pageId: 'stale-page',
                page: SidePanelPages.RoutedPage,
                pageTitle: 'Stale',
              },
            ],
            activePageId: 'stale-page',
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      });
    });

    act(() => {
      result.current.restoreSidePanelTabsSession({ routedPathInUrl: null });
    });

    expect(getTabs()).toEqual([]);
    expect(getActiveTabId()).toBeNull();
    expect(getNavigationStack()).toEqual([]);
  });

  it('adopts the live context as a tab so nothing is lost', () => {
    const { result } = renderTabsHook();

    act(() => {
      jotaiStore.set(sidePanelNavigationStackState.atom, [
        {
          ...buildRoutedTarget({
            path: '/object/company/7',
            title: 'Sequoia',
            pageId: 'page-7',
          }),
          pageId: 'page-7',
        } as SidePanelNavigationStackItem,
      ]);
    });

    act(() => {
      result.current.adoptNavigationStackAsSidePanelTab();
    });

    expect(getTabs()).toHaveLength(1);
    expect(getTabs()[0]?.contextKey).toBe('route:/object/company/7');
    expect(getActiveTabId()).toBe(getTabs()[0]?.id);
    // Adoption must not disturb what is already on screen.
    expect(getNavigationStack()[0]?.pageId).toBe('page-7');
  });

  it('does not adopt the command menu as a context', () => {
    const { result } = renderTabsHook();

    act(() => {
      jotaiStore.set(sidePanelNavigationStackState.atom, [
        {
          page: SidePanelPages.CommandMenuDisplay,
          pageId: 'command-menu',
          pageTitle: 'Command Menu',
          pageIcon: Icon123,
        } as SidePanelNavigationStackItem,
      ]);
    });

    act(() => {
      result.current.adoptNavigationStackAsSidePanelTab();
    });

    expect(getTabs()).toEqual([]);
    expect(getActiveTabId()).toBeNull();
  });

  it('keeps the previous context as a tab when opening another one in a tab', () => {
    const { result } = renderTabsHook();

    act(() => {
      jotaiStore.set(sidePanelNavigationStackState.atom, [
        {
          ...buildRoutedTarget({
            path: '/object/company/7',
            title: 'Sequoia',
            pageId: 'page-7',
          }),
          pageId: 'page-7',
        } as SidePanelNavigationStackItem,
      ]);
    });

    act(() => {
      result.current.openSidePanelTab({
        target: buildRoutedTarget({
          path: '/object/company/8',
          title: 'Index',
          pageId: 'page-8',
        }),
      });
    });

    expect(getTabs().map((tab) => tab.title)).toEqual(['Sequoia', 'Index']);
    expect(getActiveTabId()).toBe(getTabs()[1]?.id);
  });
});
