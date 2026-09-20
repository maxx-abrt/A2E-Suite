import { isDefined } from 'twenty-shared/utils';

import { type AiChatSuggestedPromptsContext } from '@/ai/types/AiChatSuggestedPromptsContext';
import { getAiChatBrowsingContextType } from '@/ai/utils/getAiChatBrowsingContextType';
import { getAiChatContextStoreInstanceId } from '@/ai/utils/getAiChatContextStoreInstanceId';
import { viewableChatChannelIdComponentState } from '@/chat/side-panel/states/viewableChatChannelIdComponentState';
import { selectedChatChannelIdState } from '@/chat/states/selectedChatChannelIdState';
import { CHAT_CHANNEL_OBJECT_NAME_SINGULAR } from '@/chat/utils/mapChatSearchRecordsToResultItems';
import { contextStoreCurrentObjectMetadataItemIdComponentState } from '@/context-store/states/contextStoreCurrentObjectMetadataItemIdComponentState';
import { contextStoreCurrentPageTypeComponentState } from '@/context-store/states/contextStoreCurrentPageTypeComponentState';
import { contextStoreCurrentViewTypeComponentState } from '@/context-store/states/contextStoreCurrentViewTypeComponentState';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { isSidePanelOpenedState } from '@/side-panel/states/isSidePanelOpenedState';
import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isCurrentPathAiChatPage } from '~/utils/isCurrentPathAiChatPage';
import { isCurrentPathDiscussionsPage } from '~/utils/isCurrentPathDiscussionsPage';

// The reactive counterpart of useGetBrowsingContext, which reads the store
// imperatively at send time and so cannot drive what the chat renders.
export const useAiChatSuggestedPromptsContext =
  (): AiChatSuggestedPromptsContext | null => {
    const isOnAiChatPage = isCurrentPathAiChatPage();
    const isOnDiscussionsPage = isCurrentPathDiscussionsPage();
    const isSidePanelOpened = useAtomStateValue(isSidePanelOpenedState);
    const sidePanelNavigationStack = useAtomStateValue(
      sidePanelNavigationStackState,
    );

    const currentSidePanelPageId = sidePanelNavigationStack.at(-1)?.pageId;

    const contextStoreInstanceId = getAiChatContextStoreInstanceId({
      isOnAiChatPage,
      isSidePanelOpened,
      currentSidePanelPageId,
    });

    const contextStoreCurrentPageType = useAtomComponentStateValue(
      contextStoreCurrentPageTypeComponentState,
      contextStoreInstanceId,
    );
    const contextStoreCurrentViewType = useAtomComponentStateValue(
      contextStoreCurrentViewTypeComponentState,
      contextStoreInstanceId,
    );
    const contextStoreCurrentObjectMetadataItemId = useAtomComponentStateValue(
      contextStoreCurrentObjectMetadataItemIdComponentState,
      contextStoreInstanceId,
    );

    // A channel is not a context-store record: the full discussions page keeps
    // it globally while the AI chat's side panel keeps it per side-panel page,
    // mirroring getAiChatContextStoreInstanceId's choice of owner.
    const selectedChatChannelId = useAtomStateValue(selectedChatChannelIdState);
    const viewableChatChannelId = useAtomComponentStateValue(
      viewableChatChannelIdComponentState,
      contextStoreInstanceId,
    );

    const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);

    const chatChannelId = isOnDiscussionsPage
      ? selectedChatChannelId
      : viewableChatChannelId;

    if (isDefined(chatChannelId)) {
      return {
        browsingContextType: 'chatChannel',
        objectNameSingular: CHAT_CHANNEL_OBJECT_NAME_SINGULAR,
      };
    }

    const objectMetadataItem = objectMetadataItems.find(
      (item) => item.id === contextStoreCurrentObjectMetadataItemId,
    );

    const browsingContextType = getAiChatBrowsingContextType({
      pageType: contextStoreCurrentPageType,
      viewType: contextStoreCurrentViewType,
    });

    if (!isDefined(objectMetadataItem) || !isDefined(browsingContextType)) {
      return null;
    }

    return {
      browsingContextType,
      objectNameSingular: objectMetadataItem.nameSingular,
    };
  };
