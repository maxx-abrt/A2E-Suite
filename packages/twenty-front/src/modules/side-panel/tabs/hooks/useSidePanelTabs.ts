import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { useNavigateSidePanel } from '@/side-panel/hooks/useNavigateSidePanel';
import { hasUserSelectedSidePanelListItemState } from '@/side-panel/states/hasUserSelectedSidePanelListItemState';
import {
  type SidePanelNavigationStackItem,
  type SidePanelNavigationTarget,
  sidePanelNavigationStackState,
} from '@/side-panel/states/sidePanelNavigationStackState';
import { activeSidePanelTabIdState } from '@/side-panel/tabs/states/activeSidePanelTabIdState';
import {
  EMPTY_SIDE_PANEL_TABS_SESSION,
  sidePanelTabsState,
} from '@/side-panel/tabs/states/sidePanelTabsState';
import {
  type SidePanelTab,
  type SidePanelTabsSession,
} from '@/side-panel/tabs/types/SidePanelTab';
import { applySidePanelTabsLruLimit } from '@/side-panel/tabs/utils/applySidePanelTabsLruLimit';
import {
  getSidePanelTabContextKeyFromPath,
  getSidePanelTabContextKeyFromSerializedItem,
} from '@/side-panel/tabs/utils/getSidePanelTabContextKey';
import { getSidePanelTabIdAfterClose } from '@/side-panel/tabs/utils/getSidePanelTabIdAfterClose';
import { hasSidePanelTabSnapshotChanged } from '@/side-panel/tabs/utils/hasSidePanelTabSnapshotChanged';
import { isValidSidePanelTabsSession } from '@/side-panel/tabs/utils/isValidSidePanelTabsSession';
import { releaseSidePanelTabPageStates } from '@/side-panel/tabs/utils/releaseSidePanelTabPageStates';
import {
  deserializeSidePanelNavigationStack,
  serializeSidePanelNavigationItem,
  serializeSidePanelNavigationStack,
} from '@/side-panel/tabs/utils/serializeSidePanelNavigationStack';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { SidePanelPages } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { useIcons } from 'twenty-ui/icon';
import { v4 } from 'uuid';

export type OpenSidePanelTabResult = {
  tabId: string;
  pageId: string;
};

export const useSidePanelTabs = () => {
  const store = useStore();
  const { getIcons, getIcon } = useIcons();
  const { openSidePanel } = useNavigateSidePanel();
  const { closeSidePanelMenu } = useSidePanelMenu();

  const sidePanelTabs = useAtomStateValue(sidePanelTabsState);
  const activeSidePanelTabId = useAtomStateValue(activeSidePanelTabIdState);

  const writeTabs = useCallback(
    (tabs: SidePanelTab[]) => {
      const session: SidePanelTabsSession = {
        ...EMPTY_SIDE_PANEL_TABS_SESSION,
        tabs,
      };

      store.set(sidePanelTabsState.atom, session);

      return session;
    },
    [store],
  );

  /**
   * Persists the live navigation stack into the active tab. Called before every
   * context switch so the deep stack of the tab being left is not lost.
   */
  const syncActiveTabFromNavigationStack = useCallback(() => {
    const currentActiveTabId = store.get(activeSidePanelTabIdState.atom);

    if (!isDefined(currentActiveTabId)) {
      return;
    }

    const session = store.get(sidePanelTabsState.atom);
    const activeTab = session.tabs.find((tab) => tab.id === currentActiveTabId);

    if (!isDefined(activeTab)) {
      return;
    }

    const navigationStack = store.get(sidePanelNavigationStackState.atom);

    if (navigationStack.length === 0) {
      return;
    }

    const stack = serializeSidePanelNavigationStack({
      stack: navigationStack,
      icons: getIcons(),
    });
    const activeItem = stack.at(-1);

    if (!isDefined(activeItem)) {
      return;
    }

    const nextTab: SidePanelTab = {
      ...activeTab,
      stack,
      activePageId: activeItem.pageId,
      title: activeItem.pageTitle,
      ...(isDefined(activeItem.pageIconKey)
        ? { iconKey: activeItem.pageIconKey }
        : {}),
      updatedAt: Date.now(),
    };

    // Guards the effect-driven caller against a write loop.
    if (!hasSidePanelTabSnapshotChanged({ tab: activeTab, nextTab })) {
      return;
    }

    writeTabs(
      session.tabs.map((tab) =>
        tab.id === currentActiveTabId ? nextTab : tab,
      ),
    );
  }, [getIcons, store, writeTabs]);

  const removeTabs = useCallback(
    (tabIdsToRemove: string[]) => {
      const session = store.get(sidePanelTabsState.atom);
      const removedTabs = session.tabs.filter((tab) =>
        tabIdsToRemove.includes(tab.id),
      );

      if (removedTabs.length === 0) {
        return session.tabs;
      }

      const remainingTabs = session.tabs.filter(
        (tab) => !tabIdsToRemove.includes(tab.id),
      );

      releaseSidePanelTabPageStates({
        store,
        removedItems: removedTabs.flatMap((tab) => tab.stack),
        remainingItems: remainingTabs.flatMap((tab) => tab.stack),
      });

      writeTabs(remainingTabs);

      return remainingTabs;
    },
    [store, writeTabs],
  );

  /**
   * Restores a tab's whole stack in one write, so the panel never renders a
   * partially switched context.
   */
  const activateSidePanelTab = useCallback(
    (tabId: string) => {
      syncActiveTabFromNavigationStack();

      const session = store.get(sidePanelTabsState.atom);
      const targetTab = session.tabs.find((tab) => tab.id === tabId);

      if (!isDefined(targetTab)) {
        return false;
      }

      const restoredStack = deserializeSidePanelNavigationStack({
        stack: targetTab.stack,
        getIcon,
      });

      if (!isDefined(restoredStack)) {
        // Unreadable payload: drop it silently rather than showing a broken tab.
        removeTabs([tabId]);

        if (store.get(activeSidePanelTabIdState.atom) === tabId) {
          store.set(activeSidePanelTabIdState.atom, null);
        }

        return false;
      }

      store.set(activeSidePanelTabIdState.atom, tabId);
      writeTabs(
        session.tabs.map((tab) =>
          tab.id === tabId ? { ...tab, updatedAt: Date.now() } : tab,
        ),
      );

      openSidePanel();
      store.set(sidePanelNavigationStackState.atom, restoredStack);
      store.set(hasUserSelectedSidePanelListItemState.atom, false);

      return true;
    },
    [
      getIcon,
      openSidePanel,
      removeTabs,
      store,
      syncActiveTabFromNavigationStack,
      writeTabs,
    ],
  );

  /**
   * Turns the context currently live in the panel into a tab, so opening
   * something else in a tab never discards what the user was looking at.
   */
  const adoptNavigationStackAsSidePanelTab = useCallback((): string | null => {
    const currentActiveTabId = store.get(activeSidePanelTabIdState.atom);

    if (isDefined(currentActiveTabId)) {
      return currentActiveTabId;
    }

    const navigationStack = store.get(sidePanelNavigationStackState.atom);
    const activeItem = navigationStack.at(-1);

    if (!isDefined(activeItem)) {
      return null;
    }

    // The command menu is a launcher, not a context worth holding open.
    if (activeItem.page === SidePanelPages.CommandMenuDisplay) {
      return null;
    }

    const stack = serializeSidePanelNavigationStack({
      stack: navigationStack,
      icons: getIcons(),
    });
    const serializedActiveItem = stack.at(-1);

    if (!isDefined(serializedActiveItem)) {
      return null;
    }

    const contextKey =
      getSidePanelTabContextKeyFromSerializedItem(serializedActiveItem);
    const session = store.get(sidePanelTabsState.atom);
    const existingTab = session.tabs.find(
      (tab) => tab.contextKey === contextKey,
    );

    if (isDefined(existingTab)) {
      store.set(activeSidePanelTabIdState.atom, existingTab.id);

      return existingTab.id;
    }

    const now = Date.now();
    const adoptedTab: SidePanelTab = {
      id: v4(),
      title: serializedActiveItem.pageTitle,
      ...(isDefined(serializedActiveItem.pageIconKey)
        ? { iconKey: serializedActiveItem.pageIconKey }
        : {}),
      stack,
      activePageId: serializedActiveItem.pageId,
      contextKey,
      createdAt: now,
      updatedAt: now,
    };

    const { tabs, evictedTabs } = applySidePanelTabsLruLimit({
      tabs: [...session.tabs, adoptedTab],
      activeTabId: adoptedTab.id,
    });

    if (evictedTabs.length > 0) {
      releaseSidePanelTabPageStates({
        store,
        removedItems: evictedTabs.flatMap((tab) => tab.stack),
        remainingItems: tabs.flatMap((tab) => tab.stack),
      });
    }

    writeTabs(tabs);
    store.set(activeSidePanelTabIdState.atom, adoptedTab.id);

    return adoptedTab.id;
  }, [getIcons, store, writeTabs]);

  const openSidePanelTab = useCallback(
    ({
      target,
      contextKey: contextKeyFromProps,
    }: {
      target: SidePanelNavigationTarget;
      contextKey?: string;
    }): OpenSidePanelTabResult | null => {
      const adoptedTabId = adoptNavigationStackAsSidePanelTab();

      syncActiveTabFromNavigationStack();

      const pageId = target.pageId ?? v4();
      const stackItem = {
        ...target,
        pageId,
      } as SidePanelNavigationStackItem;

      const serializedItem = serializeSidePanelNavigationItem({
        item: stackItem,
        icons: getIcons(),
      });

      const contextKey =
        contextKeyFromProps ??
        getSidePanelTabContextKeyFromSerializedItem(serializedItem);

      const session = store.get(sidePanelTabsState.atom);
      const existingTab = session.tabs.find(
        (tab) => tab.contextKey === contextKey,
      );

      // Opening the same context twice focuses the tab that already holds it.
      if (isDefined(existingTab)) {
        activateSidePanelTab(existingTab.id);

        return { tabId: existingTab.id, pageId: existingTab.activePageId };
      }

      const now = Date.now();
      const newTab: SidePanelTab = {
        id: v4(),
        title: serializedItem.pageTitle,
        ...(isDefined(serializedItem.pageIconKey)
          ? { iconKey: serializedItem.pageIconKey }
          : {}),
        stack: [serializedItem],
        activePageId: pageId,
        contextKey,
        createdAt: now,
        updatedAt: now,
      };

      const { tabs, evictedTabs } = applySidePanelTabsLruLimit({
        tabs: [...store.get(sidePanelTabsState.atom).tabs, newTab],
        activeTabId: newTab.id,
      });

      const previousNavigationStack = store.get(
        sidePanelNavigationStackState.atom,
      );

      if (evictedTabs.length > 0) {
        releaseSidePanelTabPageStates({
          store,
          removedItems: evictedTabs.flatMap((tab) => tab.stack),
          remainingItems: tabs.flatMap((tab) => tab.stack),
        });
      }

      // The replaced context is only disposable when no tab took ownership of it.
      if (!isDefined(adoptedTabId)) {
        releaseSidePanelTabPageStates({
          store,
          removedItems: previousNavigationStack,
          remainingItems: [...tabs.flatMap((tab) => tab.stack), serializedItem],
        });
      }

      writeTabs(tabs);
      store.set(activeSidePanelTabIdState.atom, newTab.id);

      openSidePanel();
      store.set(sidePanelNavigationStackState.atom, [stackItem]);
      store.set(hasUserSelectedSidePanelListItemState.atom, false);

      return { tabId: newTab.id, pageId };
    },
    [
      activateSidePanelTab,
      adoptNavigationStackAsSidePanelTab,
      getIcons,
      openSidePanel,
      store,
      syncActiveTabFromNavigationStack,
      writeTabs,
    ],
  );

  const closeSidePanelTab = useCallback(
    (tabId: string) => {
      const session = store.get(sidePanelTabsState.atom);
      const wasActive = store.get(activeSidePanelTabIdState.atom) === tabId;
      const neighborTabId = getSidePanelTabIdAfterClose({
        tabs: session.tabs,
        closedTabId: tabId,
      });

      removeTabs([tabId]);

      if (!wasActive) {
        return;
      }

      if (!isDefined(neighborTabId)) {
        store.set(activeSidePanelTabIdState.atom, null);
        void closeSidePanelMenu();

        return;
      }

      activateSidePanelTab(neighborTabId);
    },
    [activateSidePanelTab, closeSidePanelMenu, removeTabs, store],
  );

  /**
   * Reload path. The URL keeps precedence over the persisted session for the
   * live stack, so a shared link never gets hijacked by a local tab; the
   * selection is aligned to the URL instead.
   */
  const restoreSidePanelTabsSession = useCallback(
    ({ routedPathInUrl }: { routedPathInUrl: string | null }) => {
      const session = store.get(sidePanelTabsState.atom);

      if (!isValidSidePanelTabsSession(session)) {
        store.set(sidePanelTabsState.atom, EMPTY_SIDE_PANEL_TABS_SESSION);
        store.set(activeSidePanelTabIdState.atom, null);

        return;
      }

      if (session.tabs.length === 0) {
        store.set(activeSidePanelTabIdState.atom, null);

        return;
      }

      if (isDefined(routedPathInUrl)) {
        const contextKeyInUrl =
          getSidePanelTabContextKeyFromPath(routedPathInUrl);
        const matchingTab = session.tabs.find(
          (tab) => tab.contextKey === contextKeyInUrl,
        );

        store.set(activeSidePanelTabIdState.atom, matchingTab?.id ?? null);

        return;
      }

      const persistedActiveTabId = store.get(activeSidePanelTabIdState.atom);
      const tabToRestore = session.tabs.find(
        (tab) => tab.id === persistedActiveTabId,
      );

      if (!isDefined(tabToRestore)) {
        store.set(activeSidePanelTabIdState.atom, null);

        return;
      }

      activateSidePanelTab(tabToRestore.id);
    },
    [activateSidePanelTab, store],
  );

  return {
    tabs: sidePanelTabs.tabs,
    activeTabId: activeSidePanelTabId,
    openSidePanelTab,
    activateSidePanelTab,
    closeSidePanelTab,
    adoptNavigationStackAsSidePanelTab,
    syncActiveTabFromNavigationStack,
    restoreSidePanelTabsSession,
  };
};
