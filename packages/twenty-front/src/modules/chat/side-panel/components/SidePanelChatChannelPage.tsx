import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ChatChannelConversation } from '@/chat/components/ChatChannelConversation';
import { useChatChannel } from '@/chat/hooks/useChatChannel';
import { viewableChatChannelIdComponentState } from '@/chat/side-panel/states/viewableChatChannelIdComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';

const StyledPage = styled.div`
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

const StyledPlaceholder = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 1;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: center;
`;

// Record side-panel mini-chat. It renders the same ChatChannelConversation as
// the full discussions page, so there is exactly one composer and one live
// subscription for a channel across both surfaces.
export const SidePanelChatChannelPage = () => {
  const { t } = useLingui();

  const viewableChatChannelId = useAtomComponentStateValue(
    viewableChatChannelIdComponentState,
  );
  const { channel, loading } = useChatChannel({
    channelId: viewableChatChannelId,
  });

  if (!isDefined(channel)) {
    return (
      <StyledPlaceholder>
        {loading ? null : t`Select a channel to start chatting`}
      </StyledPlaceholder>
    );
  }

  return (
    <StyledPage data-testid="side-panel-chat-channel-page">
      <ChatChannelConversation channel={channel} />
    </StyledPage>
  );
};
