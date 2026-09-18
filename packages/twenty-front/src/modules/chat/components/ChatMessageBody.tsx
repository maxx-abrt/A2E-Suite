import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { splitChatMessageBody } from '@/chat/utils/splitChatMessageBody';

const StyledBody = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`;

const StyledMention = styled.span`
  background: ${themeCssVariables.background.transparent.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.color.blue};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: 0 ${themeCssVariables.spacing[1]};
`;

export const ChatMessageBody = ({ body }: { body: string }) => (
  <StyledBody data-testid="chat-message-body">
    {splitChatMessageBody(body).map((segment, index) =>
      segment.type === 'mention' ? (
        <StyledMention key={index}>{`@${segment.value}`}</StyledMention>
      ) : (
        <span key={index}>{segment.value}</span>
      ),
    )}
  </StyledBody>
);
