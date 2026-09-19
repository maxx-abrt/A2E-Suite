import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ChatComposer } from '@/chat/components/ChatComposer';
import { ChatMessageList } from '@/chat/components/ChatMessageList';
import { ChatThreadView } from '@/chat/components/ChatThreadView';
import { useChatAuthorLabels } from '@/chat/hooks/useChatAuthorLabels';
import { useChatChannelLive } from '@/chat/hooks/useChatChannelLive';
import { useChatMentionCandidates } from '@/chat/hooks/useChatMentionCandidates';
import { useChatMessages } from '@/chat/hooks/useChatMessages';
import { useChatWorkspaceMembers } from '@/chat/hooks/useChatWorkspaceMembers';
import { useMarkChatChannelRead } from '@/chat/hooks/useMarkChatChannelRead';
import { useSendChatMessage } from '@/chat/hooks/useSendChatMessage';
import { useSendChatMessageWithQueue } from '@/chat/hooks/useSendChatMessageWithQueue';
import { useSendChatTypingIndicator } from '@/chat/hooks/useSendChatTypingIndicator';
import { type ChatChannel } from '@/chat/types/ChatChannel';
import { buildChatThreadReplyMap } from '@/chat/utils/buildChatThreadReplyMap';
import { getChatReadState } from '@/chat/utils/getChatReadState';
import { useIsSoloWorkspace } from '@/workspace-member/hooks/useIsSoloWorkspace';
import { RealtimePresenceAvatarStack } from '~/modules/realtime/components/RealtimePresenceAvatarStack';
import { RealtimeTypingIndicator } from '~/modules/realtime/components/RealtimeTypingIndicator';
import { useWorkspacePresence } from '~/modules/realtime/hooks/useWorkspacePresence';

const StyledConversationRow = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
`;

const StyledConversation = styled.section`
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

export type ChatChannelConversationProps = {
  channel: ChatChannel;
};

// The single conversation surface shared by the full discussions page and the
// record side-panel mini-chat: one composer, one live subscription, one read
// cursor. Draft and thread state are component-local so two conversations can
// be mounted at once (page + panel) without stealing each other's draft.
export const ChatChannelConversation = ({
  channel,
}: ChatChannelConversationProps) => {
  const channelId = channel.id;
  const [draft, setDraft] = useState('');
  const [expandedThreadParentId, setExpandedThreadParentId] = useState<
    string | null
  >(null);
  const [focusedThreadParentId, setFocusedThreadParentId] = useState<
    string | null
  >(null);

  const { messages: loadedMessages } = useChatMessages({ channelId });
  const { sendChatMessage, loading: isSending } = useSendChatMessage();
  const { submitChatMessage } = useSendChatMessageWithQueue({
    sendChatMessage,
  });
  const { messages, typingWorkspaceMemberIds } = useChatChannelLive({
    channelId,
    loadedMessages,
  });
  const {
    markChannelRead,
    lastReadMessageId,
    loading: isReadCursorLoading,
  } = useMarkChatChannelRead({ channelId });
  const { searchCandidates } = useChatMentionCandidates();
  const resolveAuthorLabel = useChatAuthorLabels();
  const { workspaceMembers } = useChatWorkspaceMembers();
  const { onlineWorkspaceMembers } = useWorkspacePresence();
  const { publishTyping } = useSendChatTypingIndicator();
  const isSoloWorkspace = useIsSoloWorkspace();

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
    messages.find((message) => message.id === focusedThreadParentId) ?? null;

  const { firstUnreadMessageId } = getChatReadState({
    messages,
    lastReadMessageId,
  });

  // Switching channel must not carry the previous channel's draft or open
  // thread into the new one.
  useEffect(() => {
    setDraft('');
    setExpandedThreadParentId(null);
    setFocusedThreadParentId(null);
  }, [channelId]);

  // Mark-read on view. Waiting for the read cursor to load avoids re-writing
  // while the cursor is still unknown; once it equals the newest message the
  // effect is a no-op.
  useEffect(() => {
    if (isReadCursorLoading) {
      return;
    }

    const newestMessage = messages[messages.length - 1];

    if (!isDefined(newestMessage) || lastReadMessageId === newestMessage.id) {
      return;
    }

    void markChannelRead({ lastReadMessageId: newestMessage.id });
  }, [messages, lastReadMessageId, isReadCursorLoading, markChannelRead]);

  const handleDraftChange = (value: string) => {
    setDraft(value);

    void publishTyping({
      channelId,
      isTyping: value.trim().length > 0,
    });
  };

  const handleSubmit = async () => {
    if (draft.trim().length === 0) {
      return;
    }

    await submitChatMessage({
      channelId,
      body: draft,
      threadParentId: null,
    });
    void publishTyping({ channelId, isTyping: false });
    setDraft('');
  };

  return (
    <StyledConversationRow>
      <StyledConversation data-testid="chat-conversation">
        <StyledConversationHeader>
          <StyledChannelHeading>
            <StyledChannelName>{channel.name}</StyledChannelName>
            {isDefined(channel.topic) && (
              <StyledChannelTopic>{channel.topic}</StyledChannelTopic>
            )}
          </StyledChannelHeading>
          {!isSoloWorkspace && (
            <>
              <RealtimeTypingIndicator
                workspaceMembers={typingWorkspaceMembers}
              />
              <RealtimePresenceAvatarStack
                workspaceMembers={onlineWorkspaceMembers}
              />
            </>
          )}
        </StyledConversationHeader>
        <ChatMessageList
          messages={messages}
          firstUnreadMessageId={firstUnreadMessageId}
          expandedThreadParentId={expandedThreadParentId}
          resolveAuthorLabel={resolveAuthorLabel}
          onToggleThread={(parentMessageId) =>
            setExpandedThreadParentId((currentParentMessageId) =>
              currentParentMessageId === parentMessageId
                ? null
                : parentMessageId,
            )
          }
          onOpenThread={setFocusedThreadParentId}
        />
        <ChatComposer
          value={draft}
          onChange={handleDraftChange}
          onSubmit={() => {
            void handleSubmit();
          }}
          searchMentionCandidates={searchCandidates}
          isSending={isSending}
        />
      </StyledConversation>
      {isDefined(focusedParentMessage) && (
        <ChatThreadView
          parentMessage={focusedParentMessage}
          replies={repliesByParentId[focusedParentMessage.id] ?? []}
          resolveAuthorLabel={resolveAuthorLabel}
          onClose={() => setFocusedThreadParentId(null)}
        />
      )}
    </StyledConversationRow>
  );
};
