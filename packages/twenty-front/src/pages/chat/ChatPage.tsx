import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ChatComposer } from '@/chat/components/ChatComposer';
import { ChatMessageList } from '@/chat/components/ChatMessageList';
import { ChatSidebar } from '@/chat/components/ChatSidebar';
import { ChatThreadView } from '@/chat/components/ChatThreadView';
import { useChatAuthorLabels } from '@/chat/hooks/useChatAuthorLabels';
import { useChatChannelLive } from '@/chat/hooks/useChatChannelLive';
import { useChatChannels } from '@/chat/hooks/useChatChannels';
import { useChatMentionCandidates } from '@/chat/hooks/useChatMentionCandidates';
import { useChatMessages } from '@/chat/hooks/useChatMessages';
import { useChatUnreadCounts } from '@/chat/hooks/useChatUnreadCounts';
import { useChatWorkspaceMembers } from '@/chat/hooks/useChatWorkspaceMembers';
import { useMarkChatChannelRead } from '@/chat/hooks/useMarkChatChannelRead';
import { useSendChatMessage } from '@/chat/hooks/useSendChatMessage';
import { useSendChatMessageWithQueue } from '@/chat/hooks/useSendChatMessageWithQueue';
import { useSendChatTypingIndicator } from '@/chat/hooks/useSendChatTypingIndicator';
import { chatComposerDraftState } from '@/chat/states/chatComposerDraftState';
import { expandedChatThreadParentIdState } from '@/chat/states/expandedChatThreadParentIdState';
import { focusedChatThreadParentIdState } from '@/chat/states/focusedChatThreadParentIdState';
import { selectedChatChannelIdState } from '@/chat/states/selectedChatChannelIdState';
import { buildChatThreadReplyMap } from '@/chat/utils/buildChatThreadReplyMap';
import { getChatReadState } from '@/chat/utils/getChatReadState';
import { groupChatChannelsBySection } from '@/chat/utils/groupChatChannelsBySection';
import { RealtimePresenceAvatarStack } from '~/modules/realtime/components/RealtimePresenceAvatarStack';
import { RealtimeReconnectBanner } from '~/modules/realtime/components/RealtimeReconnectBanner';
import { RealtimeTypingIndicator } from '~/modules/realtime/components/RealtimeTypingIndicator';
import { useWorkspacePresence } from '~/modules/realtime/hooks/useWorkspacePresence';
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
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledChannelHeading = styled.div`
  align-items: baseline;
  display: flex;
  flex: 1;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
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
  const [searchParams] = useSearchParams();

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
  const { messages: loadedMessages } = useChatMessages({
    channelId: selectedChatChannelId,
  });
  const { sendChatMessage, loading: isSending } = useSendChatMessage();
  const { submitChatMessage } = useSendChatMessageWithQueue({
    sendChatMessage,
  });
  const { messages, typingWorkspaceMemberIds } = useChatChannelLive({
    channelId: selectedChatChannelId,
    loadedMessages,
  });
  const {
    markChannelRead,
    lastReadMessageId,
    loading: isReadCursorLoading,
  } = useMarkChatChannelRead({ channelId: selectedChatChannelId });
  const { searchCandidates } = useChatMentionCandidates();
  const resolveAuthorLabel = useChatAuthorLabels();
  const { workspaceMembers } = useChatWorkspaceMembers();
  const { onlineWorkspaceMembers } = useWorkspacePresence();
  const { publishTyping } = useSendChatTypingIndicator();

  const sections = useMemo(
    () => groupChatChannelsBySection(channels),
    [channels],
  );
  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChatChannelId,
  );

  const typingWorkspaceMembers = useMemo(
    () =>
      typingWorkspaceMemberIds.flatMap((workspaceMemberId) => {
        const workspaceMember = workspaceMembers.find(
          (member) => member.id === workspaceMemberId,
        );

        return isDefined(workspaceMember) ? [workspaceMember] : [];
      }),
    [typingWorkspaceMemberIds, workspaceMembers],
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

  const handleDraftChange = (value: string) => {
    setChatComposerDraft(value);

    if (isDefined(selectedChatChannelId)) {
      void publishTyping({
        channelId: selectedChatChannelId,
        isTyping: value.trim().length > 0,
      });
    }
  };

  const handleSubmit = async () => {
    if (
      !isDefined(selectedChatChannelId) ||
      chatComposerDraft.trim().length === 0
    ) {
      return;
    }

    await submitChatMessage({
      channelId: selectedChatChannelId,
      body: chatComposerDraft,
      threadParentId: null,
    });
    void publishTyping({ channelId: selectedChatChannelId, isTyping: false });
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
        <RealtimeReconnectBanner />
        {isDefined(selectedChannel) ? (
          <>
            <StyledConversationHeader>
              <StyledChannelHeading>
                <StyledChannelName>{selectedChannel.name}</StyledChannelName>
                {isDefined(selectedChannel.topic) && (
                  <StyledChannelTopic>
                    {selectedChannel.topic}
                  </StyledChannelTopic>
                )}
              </StyledChannelHeading>
              <RealtimeTypingIndicator
                workspaceMembers={typingWorkspaceMembers}
              />
              <RealtimePresenceAvatarStack
                workspaceMembers={onlineWorkspaceMembers}
              />
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
              onChange={handleDraftChange}
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
