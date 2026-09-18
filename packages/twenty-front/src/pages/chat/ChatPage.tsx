import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ChatComposer } from '@/chat/components/ChatComposer';
import { ChatMessageList } from '@/chat/components/ChatMessageList';
import { ChatSidebar } from '@/chat/components/ChatSidebar';
import { ChatThreadView } from '@/chat/components/ChatThreadView';
import { useChatAuthorLabels } from '@/chat/hooks/useChatAuthorLabels';
import { useChatChannels } from '@/chat/hooks/useChatChannels';
import { useChatMentionCandidates } from '@/chat/hooks/useChatMentionCandidates';
import { useChatMessages } from '@/chat/hooks/useChatMessages';
import { useChatUnreadCounts } from '@/chat/hooks/useChatUnreadCounts';
import { useMarkChatChannelRead } from '@/chat/hooks/useMarkChatChannelRead';
import { useSendChatMessage } from '@/chat/hooks/useSendChatMessage';
import { chatComposerDraftState } from '@/chat/states/chatComposerDraftState';
import { expandedChatThreadParentIdState } from '@/chat/states/expandedChatThreadParentIdState';
import { focusedChatThreadParentIdState } from '@/chat/states/focusedChatThreadParentIdState';
import { selectedChatChannelIdState } from '@/chat/states/selectedChatChannelIdState';
import { buildChatThreadReplyMap } from '@/chat/utils/buildChatThreadReplyMap';
import { getChatReadState } from '@/chat/utils/getChatReadState';
import { groupChatChannelsBySection } from '@/chat/utils/groupChatChannelsBySection';
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

const StyledConversationHeader = styled.header`
  align-items: baseline;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledChannelName = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledChannelTopic = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

  const selectedChatChannelId = useAtomStateValue(selectedChatChannelIdState);
  const setSelectedChatChannelId = useSetAtomState(selectedChatChannelIdState);
  const expandedChatThreadParentId = useAtomStateValue(
    expandedChatThreadParentIdState,
  );
  const setExpandedChatThreadParentId = useSetAtomState(
    expandedChatThreadParentIdState,
  );
  const focusedChatThreadParentId = useAtomStateValue(
    focusedChatThreadParentIdState,
  );
  const setFocusedChatThreadParentId = useSetAtomState(
    focusedChatThreadParentIdState,
  );
  const chatComposerDraft = useAtomStateValue(chatComposerDraftState);
  const setChatComposerDraft = useSetAtomState(chatComposerDraftState);

  const { channels } = useChatChannels();
  const { unreadCountByChannelId } = useChatUnreadCounts();
  const { messages } = useChatMessages({ channelId: selectedChatChannelId });
  const { sendChatMessage, loading: isSending } = useSendChatMessage();
  const {
    markChannelRead,
    lastReadMessageId,
    loading: isReadCursorLoading,
  } = useMarkChatChannelRead({ channelId: selectedChatChannelId });
  const { searchCandidates } = useChatMentionCandidates();
  const resolveAuthorLabel = useChatAuthorLabels();

  const sections = useMemo(
    () => groupChatChannelsBySection(channels),
    [channels],
  );
  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChatChannelId,
  );

  const repliesByParentId = useMemo(
    () => buildChatThreadReplyMap(messages),
    [messages],
  );
  const focusedParentMessage =
    messages.find((message) => message.id === focusedChatThreadParentId) ??
    null;

  const { firstUnreadMessageId } = getChatReadState({
    messages,
    lastReadMessageId,
  });

  // Select the first channel once channels load so the page is never empty.
  useEffect(() => {
    if (selectedChatChannelId !== null) {
      return;
    }

    const firstChannel = sections[0]?.channels[0];

    if (isDefined(firstChannel)) {
      setSelectedChatChannelId(firstChannel.id);
    }
  }, [selectedChatChannelId, sections, setSelectedChatChannelId]);

  // Mark-read on view. Waiting for the read cursor to load avoids re-writing
  // while the cursor is still unknown; once it equals the newest message the
  // effect is a no-op.
  useEffect(() => {
    if (selectedChatChannelId === null || isReadCursorLoading) {
      return;
    }

    const newestMessage = messages[messages.length - 1];

    if (!isDefined(newestMessage) || lastReadMessageId === newestMessage.id) {
      return;
    }

    void markChannelRead({ lastReadMessageId: newestMessage.id });
  }, [
    selectedChatChannelId,
    messages,
    lastReadMessageId,
    isReadCursorLoading,
    markChannelRead,
  ]);

  const handleSelectChannel = (channelId: string) => {
    setSelectedChatChannelId(channelId);
    setExpandedChatThreadParentId(null);
    setFocusedChatThreadParentId(null);
    setChatComposerDraft('');
  };

  const handleSubmit = async () => {
    if (
      !isDefined(selectedChatChannelId) ||
      chatComposerDraft.trim().length === 0
    ) {
      return;
    }

    await sendChatMessage({
      channelId: selectedChatChannelId,
      body: chatComposerDraft,
    });
    setChatComposerDraft('');
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
        {isDefined(selectedChannel) ? (
          <>
            <StyledConversationHeader>
              <StyledChannelName>{selectedChannel.name}</StyledChannelName>
              {isDefined(selectedChannel.topic) && (
                <StyledChannelTopic>{selectedChannel.topic}</StyledChannelTopic>
              )}
            </StyledConversationHeader>
            <ChatMessageList
              messages={messages}
              firstUnreadMessageId={firstUnreadMessageId}
              expandedThreadParentId={expandedChatThreadParentId}
              resolveAuthorLabel={resolveAuthorLabel}
              onToggleThread={(parentMessageId) =>
                setExpandedChatThreadParentId((currentParentMessageId) =>
                  currentParentMessageId === parentMessageId
                    ? null
                    : parentMessageId,
                )
              }
              onOpenThread={setFocusedChatThreadParentId}
            />
            <ChatComposer
              value={chatComposerDraft}
              onChange={setChatComposerDraft}
              onSubmit={() => {
                void handleSubmit();
              }}
              searchMentionCandidates={searchCandidates}
              isSending={isSending}
            />
          </>
        ) : (
          <StyledEmptyConversation>
            {t`Select a channel to start chatting`}
          </StyledEmptyConversation>
        )}
      </StyledConversation>
      {isDefined(focusedParentMessage) && (
        <ChatThreadView
          parentMessage={focusedParentMessage}
          replies={repliesByParentId[focusedParentMessage.id] ?? []}
          resolveAuthorLabel={resolveAuthorLabel}
          onClose={() => setFocusedChatThreadParentId(null)}
        />
      )}
    </StyledChatPage>
  );
};
