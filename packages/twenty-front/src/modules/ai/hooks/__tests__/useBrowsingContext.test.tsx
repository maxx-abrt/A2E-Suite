import { renderHook } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import {
  AppPath,
  ContextStorePageType,
  SidePanelPages,
} from 'twenty-shared/types';
import { IconDotsVertical } from 'twenty-ui/icon';

import { useGetBrowsingContext } from '@/ai/hooks/useBrowsingContext';
import { viewableChatChannelIdComponentState } from '@/chat/side-panel/states/viewableChatChannelIdComponentState';
import { selectedChatChannelIdState } from '@/chat/states/selectedChatChannelIdState';
import { MAIN_CONTEXT_STORE_INSTANCE_ID } from '@/context-store/constants/MainContextStoreInstanceId';
import { contextStoreCurrentObjectMetadataItemIdComponentState } from '@/context-store/states/contextStoreCurrentObjectMetadataItemIdComponentState';
import { contextStoreCurrentPageTypeComponentState } from '@/context-store/states/contextStoreCurrentPageTypeComponentState';
import { contextStoreTargetedRecordsRuleComponentState } from '@/context-store/states/contextStoreTargetedRecordsRuleComponentState';
import { isSidePanelOpenedState } from '@/side-panel/states/isSidePanelOpenedState';
import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';
import { setTestObjectMetadataItemsInMetadataStore } from '~/testing/utils/setTestObjectMetadataItemsInMetadataStore';

const objectMetadataItems = getTestEnrichedObjectMetadataItemsMock();

const getObjectMetadataItemId = (nameSingular: string) =>
  objectMetadataItems.find((item) => item.nameSingular === nameSingular)?.id;

const Wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
);

const setMainContextStore = ({
  pageType = null,
  objectNameSingular,
  selectedRecordIds,
}: {
  pageType?: ContextStorePageType | null;
  objectNameSingular?: string;
  selectedRecordIds?: string[];
}) => {
  const instanceId = MAIN_CONTEXT_STORE_INSTANCE_ID;

  jotaiStore.set(
    contextStoreCurrentPageTypeComponentState.atomFamily({ instanceId }),
    pageType,
  );
  jotaiStore.set(
    contextStoreCurrentObjectMetadataItemIdComponentState.atomFamily({
      instanceId,
    }),
    objectNameSingular === undefined
      ? undefined
      : getObjectMetadataItemId(objectNameSingular),
  );

  if (selectedRecordIds !== undefined) {
    jotaiStore.set(
      contextStoreTargetedRecordsRuleComponentState.atomFamily({ instanceId }),
      { mode: 'selection', selectedRecordIds },
    );
  }
};

describe('useGetBrowsingContext', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    resetJotaiStore();
    setTestObjectMetadataItemsInMetadataStore(jotaiStore, objectMetadataItems);
  });

  it('should carry the selected channel id on the discussions page', () => {
    window.history.pushState({}, '', AppPath.Discussions);
    jotaiStore.set(selectedChatChannelIdState.atom, 'channel-1');

    const { result } = renderHook(() => useGetBrowsingContext(), {
      wrapper: Wrapper,
    });

    expect(result.current.getBrowsingContext()).toEqual({
      type: 'chatChannel',
      objectNameSingular: 'chatChannel',
      channelId: 'channel-1',
    });
  });

  it('should carry the side-panel channel id while on the AI chat page', () => {
    window.history.pushState({}, '', '/chat');
    jotaiStore.set(isSidePanelOpenedState.atom, true);
    jotaiStore.set(sidePanelNavigationStackState.atom, [
      {
        page: SidePanelPages.ChatChannel,
        pageTitle: 'Channel',
        pageIcon: IconDotsVertical,
        pageId: 'channel-side-panel-page',
      },
    ]);
    jotaiStore.set(
      viewableChatChannelIdComponentState.atomFamily({
        instanceId: 'channel-side-panel-page',
      }),
      'channel-2',
    );

    const { result } = renderHook(() => useGetBrowsingContext(), {
      wrapper: Wrapper,
    });

    expect(result.current.getBrowsingContext()).toEqual({
      type: 'chatChannel',
      objectNameSingular: 'chatChannel',
      channelId: 'channel-2',
    });
  });

  it('should omit the channel id field when no channel is selected', () => {
    setMainContextStore({
      pageType: ContextStorePageType.Record,
      objectNameSingular: 'company',
      selectedRecordIds: ['record-1'],
    });

    const { result } = renderHook(() => useGetBrowsingContext(), {
      wrapper: Wrapper,
    });

    const browsingContext = result.current.getBrowsingContext();

    expect(browsingContext).toEqual({
      type: 'recordPage',
      objectNameSingular: 'company',
      recordId: 'record-1',
    });
    expect(browsingContext).not.toHaveProperty('channelId');
  });

  it('should keep the record-page context unchanged even when a stale channel is selected', () => {
    window.history.pushState({}, '', '/objects/companies');
    jotaiStore.set(selectedChatChannelIdState.atom, 'channel-stale');
    setMainContextStore({
      pageType: ContextStorePageType.Record,
      objectNameSingular: 'company',
      selectedRecordIds: ['record-1'],
    });

    const { result } = renderHook(() => useGetBrowsingContext(), {
      wrapper: Wrapper,
    });

    const browsingContext = result.current.getBrowsingContext();

    expect(browsingContext).toEqual({
      type: 'recordPage',
      objectNameSingular: 'company',
      recordId: 'record-1',
    });
    expect(browsingContext).not.toHaveProperty('channelId');
  });
});
