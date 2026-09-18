import { type ChatChannelKind } from '@/chat/types/ChatChannel';

// Sidebar order matches the channel kind options shipped by the a2e-chat
// manifest: workspace-wide first, then project channels, then ad-hoc topics.
export const CHAT_CHANNEL_SECTION_ORDER: ChatChannelKind[] = [
  'WORKSPACE',
  'PROJECT',
  'CUSTOM',
];
