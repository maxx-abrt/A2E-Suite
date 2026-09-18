import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { IconArrowRight } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ChatMessageBody } from '@/chat/components/ChatMessageBody';
import { type ChatMessage } from '@/chat/types/ChatMessage';
import {
  buildChatThreadReplyMap,
  getChatThreadReplyCount,
  getTopLevelChatMessages,
} from '@/chat/utils/buildChatThreadReplyMap';

const StyledMessageList = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  text-align: center;
`;

const StyledUnreadDivider = styled.div`
  align-items: center;
  color: ${themeCssVariables.color.red};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[2]};

  &::before,
  &::after {
    background: ${themeCssVariables.color.red};
    content: '';
    flex: 1;
    height: 1px;
  }
`;

const StyledMessage = styled.article`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledMessageHeader = styled.div`
  align-items: baseline;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledAuthor = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledTimestamp = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledThreadActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  margin-top: 2px;
`;

const StyledThreadButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: ${themeCssVariables.color.blue};
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 2px;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`;

const StyledReplies = styled.div`
  border-left: 2px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin-left: ${themeCssVariables.spacing[2]};
  margin-top: ${themeCssVariables.spacing[1]};
  padding-left: ${themeCssVariables.spacing[2]};
`;

const StyledReply = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const formatTimestamp = (createdAt: string) =>
  new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export type ChatMessageListProps = {
  messages: ChatMessage[];
  firstUnreadMessageId: string | null;
  expandedThreadParentId: string | null;
  resolveAuthorLabel: (authorId: string | null) => string;
  onToggleThread: (parentMessageId: string) => void;
  onOpenThread: (parentMessageId: string) => void;
};

export const ChatMessageList = ({
  messages,
  firstUnreadMessageId,
  expandedThreadParentId,
  resolveAuthorLabel,
  onToggleThread,
  onOpenThread,
}: ChatMessageListProps) => {
  const { t } = useLingui();

  const repliesByParentId = useMemo(
    () => buildChatThreadReplyMap(messages),
    [messages],
  );
  const topLevelMessages = useMemo(
    () => getTopLevelChatMessages(messages),
    [messages],
  );

  if (topLevelMessages.length === 0) {
    return (
      <StyledMessageList data-testid="chat-message-list">
        <StyledEmptyState>{t`No messages yet`}</StyledEmptyState>
      </StyledMessageList>
    );
  }

  return (
    <StyledMessageList data-testid="chat-message-list">
      {topLevelMessages.map((message) => {
        const replies = repliesByParentId[message.id] ?? [];
        const replyCount = getChatThreadReplyCount(
          repliesByParentId,
          message.id,
        );
        const isExpanded = expandedThreadParentId === message.id;

        return (
          <div key={message.id}>
            {message.id === firstUnreadMessageId && (
              <StyledUnreadDivider data-testid="chat-unread-divider">
                {t`New messages`}
              </StyledUnreadDivider>
            )}
            <StyledMessage data-testid={`chat-message-${message.id}`}>
              <StyledMessageHeader>
                <StyledAuthor>
                  {resolveAuthorLabel(message.authorId)}
                </StyledAuthor>
                <StyledTimestamp>
                  {formatTimestamp(message.createdAt)}
                </StyledTimestamp>
              </StyledMessageHeader>
              <ChatMessageBody body={message.body} />
              <StyledThreadActions>
                {replyCount > 0 && (
                  <StyledThreadButton
                    type="button"
                    data-testid={`chat-thread-toggle-${message.id}`}
                    aria-expanded={isExpanded}
                    onClick={() => onToggleThread(message.id)}
                  >
                    {t`${replyCount} replies`}
                  </StyledThreadButton>
                )}
                <StyledThreadButton
                  type="button"
                  data-testid={`chat-thread-open-${message.id}`}
                  onClick={() => onOpenThread(message.id)}
                >
                  <IconArrowRight size={12} />
                  {t`Open thread`}
                </StyledThreadButton>
              </StyledThreadActions>
              {isExpanded && (
                <StyledReplies
                  data-testid={`chat-thread-replies-${message.id}`}
                >
                  {replies.map((reply) => (
                    <StyledReply
                      key={reply.id}
                      data-testid={`chat-thread-reply-${reply.id}`}
                    >
                      <StyledMessageHeader>
                        <StyledAuthor>
                          {resolveAuthorLabel(reply.authorId)}
                        </StyledAuthor>
                        <StyledTimestamp>
                          {formatTimestamp(reply.createdAt)}
                        </StyledTimestamp>
                      </StyledMessageHeader>
                      <ChatMessageBody body={reply.body} />
                    </StyledReply>
                  ))}
                </StyledReplies>
              )}
            </StyledMessage>
          </div>
        );
      })}
    </StyledMessageList>
  );
};
