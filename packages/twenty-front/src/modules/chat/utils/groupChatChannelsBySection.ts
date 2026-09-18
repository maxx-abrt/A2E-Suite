import { CHAT_CHANNEL_SECTION_ORDER } from '@/chat/constants/ChatChannelSectionOrder';
import {
  type ChatChannel,
  type ChatChannelSection,
} from '@/chat/types/ChatChannel';

const byName = (firstChannel: ChatChannel, secondChannel: ChatChannel) =>
  firstChannel.name.localeCompare(secondChannel.name, undefined, {
    sensitivity: 'base',
  });

// Groups channels into the sidebar's workspace/project/custom sections, keeping
// the declared section order and dropping empty sections so an unused kind does
// not leave a dangling header.
export const groupChatChannelsBySection = (
  channels: ChatChannel[],
): ChatChannelSection[] =>
  CHAT_CHANNEL_SECTION_ORDER.map((kind) => ({
    kind,
    channels: channels.filter((channel) => channel.kind === kind).sort(byName),
  })).filter((section) => section.channels.length > 0);
