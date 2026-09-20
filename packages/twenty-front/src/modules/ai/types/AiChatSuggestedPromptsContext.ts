import { type BrowsingContext } from '@/ai/types/BrowsingContext';

// A chat channel is not a browsing context the send-time context-store builds
// (no record/view), but it is a browsing surface the assistant must recognise
// so the chat app's context tools and prompts surface while a channel is open.
export type AiChatSuggestedPromptsContextType =
  | BrowsingContext['type']
  | 'chatChannel';

export type AiChatSuggestedPromptsContext = {
  browsingContextType: AiChatSuggestedPromptsContextType;
  objectNameSingular: string;
};
