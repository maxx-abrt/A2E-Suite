import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { viewableChatChannelIdComponentState } from '@/chat/side-panel/states/viewableChatChannelIdComponentState';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { SidePanelPages } from 'twenty-shared/types';
import { IconMessage } from 'twenty-ui/icon';
import { v4 } from 'uuid';

// Opens the record-linked channel as a side-panel mini-chat. The caller passes
// the channel name so the panel header is correct before the channel query
// resolves.
export const useOpenChatChannelInSidePanel = () => {
  const store = useStore();
  const { navigateSidePanelMenu } = useSidePanelMenu();

  const openChatChannelInSidePanel = useCallback(
    ({
      channelId,
      channelName,
    }: {
      channelId: string;
      channelName: string;
    }) => {
      const pageId = v4();

      store.set(
        viewableChatChannelIdComponentState.atomFamily({
          instanceId: pageId,
        }),
        channelId,
      );

      navigateSidePanelMenu({
        page: SidePanelPages.ChatChannel,
        pageTitle: channelName,
        pageIcon: IconMessage,
        pageId,
      });
    },
    [navigateSidePanelMenu, store],
  );

  return { openChatChannelInSidePanel };
};
