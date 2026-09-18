import { gql } from '@apollo/client';

// Hand-written for the same reason as `chatMessagesQuery`: typing is a server
// `@MetadataResolver` mutation, not part of the metadata codegen surface.
export const SEND_CHAT_TYPING_INDICATOR_MUTATION = gql`
  mutation SendChatTypingIndicator($input: SendChatTypingInput!) {
    sendChatTypingIndicator(input: $input) {
      channelId
      workspaceMemberId
      isTyping
      occurredAt
    }
  }
`;

export type SendChatTypingIndicatorResult = {
  sendChatTypingIndicator: {
    channelId: string;
    workspaceMemberId: string;
    isTyping: boolean;
    occurredAt: string;
  };
};

export type SendChatTypingIndicatorVariables = {
  input: { channelId: string; isTyping: boolean };
};
