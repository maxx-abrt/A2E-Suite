import { sidePanelNavigationMorphItemsByPageState } from '@/side-panel/states/sidePanelNavigationMorphItemsByPageState';
import { sidePanelSubPageStackComponentState } from '@/side-panel/states/sidePanelSubPageStackComponentState';
import { getShowPageTabListComponentId } from '@/ui/layout/show-page/utils/getShowPageTabListComponentId';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { releaseRoutedFlowStateScope } from '@/ui/utilities/state/jotai/utils/routedFlowStateScopeRegistry';
import { isNonEmptyArray } from '@sniptt/guards';
import { type getDefaultStore } from 'jotai';
import { isDefined } from 'twenty-shared/utils';

type ScopedNavigationItem = {
  pageId: string;
  routedFlowStateScopeId?: string;
};

/**
 * Mirrors the per-page cleanup the history hook performs when a stack entry is
 * popped, so closing a tab does not leave orphan component state behind.
 */
export const releaseSidePanelTabPageStates = ({
  store,
  removedItems,
  remainingItems,
}: {
  store: ReturnType<typeof getDefaultStore>;
  removedItems: ScopedNavigationItem[];
  remainingItems: ScopedNavigationItem[];
}) => {
  const remainingPageIds = new Set(remainingItems.map((item) => item.pageId));
  const remainingScopeIds = new Set(
    remainingItems.map((item) => item.routedFlowStateScopeId).filter(isDefined),
  );

  const currentMorphItems = store.get(
    sidePanelNavigationMorphItemsByPageState.atom,
  );
  const nextMorphItems = new Map(currentMorphItems);

  for (const removedItem of removedItems) {
    if (remainingPageIds.has(removedItem.pageId)) {
      continue;
    }

    store.set(
      sidePanelSubPageStackComponentState.atomFamily({
        instanceId: removedItem.pageId,
      }),
      [],
    );

    const morphItems = currentMorphItems.get(removedItem.pageId);

    if (isNonEmptyArray(morphItems)) {
      store.set(
        activeTabIdComponentState.atomFamily({
          instanceId: getShowPageTabListComponentId({
            pageId: removedItem.pageId,
            targetObjectId: morphItems[0].recordId,
          }),
        }),
        null,
      );
    }

    nextMorphItems.delete(removedItem.pageId);

    if (
      isDefined(removedItem.routedFlowStateScopeId) &&
      !remainingScopeIds.has(removedItem.routedFlowStateScopeId)
    ) {
      releaseRoutedFlowStateScope(removedItem.routedFlowStateScopeId);
    }
  }

  store.set(sidePanelNavigationMorphItemsByPageState.atom, nextMorphItems);
};
