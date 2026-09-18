import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconX } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ChatMessageBody } from '@/chat/components/ChatMessageBody';
import { type ChatMessage } from '@/chat/types/ChatMessage';

const StyledThreadPane = styled.section`
  background: ${themeCssVariables.background.primary};
  border-left: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  width: 320px;
`;

const StyledHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledHeaderTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledParentMessage = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledReplyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledReply = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledAuthor = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledTimestamp = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  margin-left: ${themeCssVariables.spacing[1]};
`;

const StyledEmptyReplies = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  padding: ${themeCssVariables.spacing[2]};
`;

const formatTimestamp = (createdAt: string) =>
  new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export type ChatThreadViewProps = {
  parentMessage: ChatMessage;
  replies: ChatMessage[];
  resolveAuthorLabel: (authorId: string | null) => string;
  onClose: () => void;
};

export const ChatThreadView = ({
  parentMessage,
  replies,
  resolveAuthorLabel,
  onClose,
}: ChatThreadViewProps) => {
  const { t } = useLingui();

  return (
    <StyledThreadPane data-testid="chat-thread-view">
      <StyledHeader>
        <StyledHeaderTitle>{t`Thread`}</StyledHeaderTitle>
        <IconButton
          Icon={IconX}
          variant="tertiary"
          size="small"
          ariaLabel={t`Close thread`}
          dataTestId="chat-thread-close"
          onClick={onClose}
        />
      </StyledHeader>
      <StyledParentMessage>
        <div>
          <StyledAuthor>
            {resolveAuthorLabel(parentMessage.authorId)}
          </StyledAuthor>
          <StyledTimestamp>
            {formatTimestamp(parentMessage.createdAt)}
          </StyledTimestamp>
        </div>
        <ChatMessageBody body={parentMessage.body} />
      </StyledParentMessage>
      {replies.length === 0 ? (
        <StyledEmptyReplies>{t`No replies yet`}</StyledEmptyReplies>
      ) : (
        <StyledReplyList data-testid="chat-thread-reply-list">
          {replies.map((reply) => (
            <StyledReply
              key={reply.id}
              data-testid={`chat-thread-reply-${reply.id}`}
            >
              <div>
                <StyledAuthor>
                  {resolveAuthorLabel(reply.authorId)}
                </StyledAuthor>
                <StyledTimestamp>
                  {formatTimestamp(reply.createdAt)}
                </StyledTimestamp>
              </div>
              <ChatMessageBody body={reply.body} />
            </StyledReply>
          ))}
        </StyledReplyList>
      )}
    </StyledThreadPane>
  );
};
