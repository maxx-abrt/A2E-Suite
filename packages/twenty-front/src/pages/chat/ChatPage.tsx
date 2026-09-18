import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ChatChannelConversation } from '@/chat/components/ChatChannelConversation';
import { ChatSidebar } from '@/chat/components/ChatSidebar';
import { useChatChannels } from '@/chat/hooks/useChatChannels';
import { useChatUnreadCounts } from '@/chat/hooks/useChatUnreadCounts';
import { selectedChatChannelIdState } from '@/chat/states/selectedChatChannelIdState';
import { groupChatChannelsBySection } from '@/chat/utils/groupChatChannelsBySection';
import { RealtimeReconnectBanner } from '~/modules/realtime/components/RealtimeReconnectBanner';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

const StyledChatPage = styled.div`
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

const StyledConversation = styled.main`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const StyledEmptyConversation = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 1;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: center;
`;

export const ChatPage = () => {
  const { t } = useLingui();
  const [searchParams] = useSearchParams();

  const selectedChatChannelId = useAtomStateValue(selectedChatChannelIdState);
  const setSelectedChatChannelId = useSetAtomState(selectedChatChannelIdState);

  const { channels } = useChatChannels();
  const { unreadCountByChannelId } = useChatUnreadCounts();

  const sections = useMemo(
    () => groupChatChannelsBySection(channels),
    [channels],
  );
  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChatChannelId,
  );

  // "Go to channel" deep link: the Cmd+K provider appends `channelId`, so the
  // page lands on the named channel instead of just the discussions list.
  const requestedChannelId = searchParams.get('channelId');

  // Select the deep-linked channel, else the first channel once channels load,
  // so the page is never empty.
  useEffect(() => {
    if (
      isDefined(requestedChannelId) &&
      channels.some((channel) => channel.id === requestedChannelId) &&
      requestedChannelId !== selectedChatChannelId
    ) {
      setSelectedChatChannelId(requestedChannelId);

      return;
    }

    if (selectedChatChannelId !== null) {
      return;
    }

    const firstChannel = sections[0]?.channels[0];

    if (isDefined(firstChannel)) {
      setSelectedChatChannelId(firstChannel.id);
    }
  }, [
    channels,
    requestedChannelId,
    sections,
    selectedChatChannelId,
    setSelectedChatChannelId,
  ]);

  const handleSelectChannel = (channelId: string) => {
    setSelectedChatChannelId(channelId);
  };

  return (
    <StyledChatPage data-testid="chat-page">
      <ChatSidebar
        sections={sections}
        selectedChannelId={selectedChatChannelId}
        unreadCountByChannelId={unreadCountByChannelId}
        onSelectChannel={handleSelectChannel}
      />
      <StyledConversation>
        <RealtimeReconnectBanner />
        {isDefined(selectedChannel) ? (
          <ChatChannelConversation channel={selectedChannel} />
        ) : (
          <StyledEmptyConversation>
            {t`Select a channel to start chatting`}
          </StyledEmptyConversation>
        )}
      </StyledConversation>
    </StyledChatPage>
  );
};
