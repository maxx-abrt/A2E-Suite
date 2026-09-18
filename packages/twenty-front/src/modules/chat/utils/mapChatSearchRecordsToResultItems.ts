import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';

import { type GroupableSearchResultItem } from '@/side-panel/pages/search/utils/groupSearchResultItems';

export const CHAT_CHANNEL_SEARCH_GROUP_KEY = 'chat:channel';
export const CHAT_MESSAGE_SEARCH_GROUP_KEY = 'chat:message';

export const CHAT_CHANNEL_OBJECT_NAME_SINGULAR = 'chatChannel';
export const CHAT_MESSAGE_OBJECT_NAME_SINGULAR = 'chatMessage';

// A channel result deep-links to the channel it names; `ChatPage` reads the
// `channelId` query param on mount, so "go to channel" lands on the channel,
// not just the discussions page.
export const buildChatChannelSearchPath = (channelId: string): string =>
  getAppPath(AppPath.Discussions, undefined, { channelId });

export type ChatSearchRecord = {
  recordId: string;
  label: string;
  objectNameSingular: string;
};

// Pure mapping, unit-testable without Apollo: the hook owns the query, this
// owns the shape the Cmd+K list renders. Channels and messages are grouped
// separately so the P1.4 grouping pipeline renders two headings.
export const mapChatSearchRecordsToResultItems = ({
  channels,
  messages,
}: {
  channels: ChatSearchRecord[];
  messages: ChatSearchRecord[];
}): GroupableSearchResultItem[] => {
  const channelItems: GroupableSearchResultItem[] = channels
    .filter((channel) => isNonEmptyString(channel.label))
    .map((channel) => ({
      id: `chat-channel-${channel.recordId}`,
      label: channel.label,
      objectNameSingular: CHAT_CHANNEL_OBJECT_NAME_SINGULAR,
      recordId: channel.recordId,
      objectLabel: 'Discussions',
      avatarType: 'rounded' as const,
      description: 'Canal',
      groupKey: CHAT_CHANNEL_SEARCH_GROUP_KEY,
      groupHeading: 'Discussions',
      path: buildChatChannelSearchPath(channel.recordId),
    }));

  const messageItems: GroupableSearchResultItem[] = messages
    .filter((message) => isNonEmptyString(message.label))
    .map((message) => ({
      id: `chat-message-${message.recordId}`,
      label: message.label,
      objectNameSingular: CHAT_MESSAGE_OBJECT_NAME_SINGULAR,
      recordId: message.recordId,
      objectLabel: 'Messages',
      avatarType: 'rounded' as const,
      description: 'Message',
      groupKey: CHAT_MESSAGE_SEARCH_GROUP_KEY,
      groupHeading: 'Messages',
    }));

  return [...channelItems, ...messageItems];
};
