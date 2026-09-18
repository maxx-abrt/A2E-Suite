import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';

import { groupSearchResultItems } from '@/side-panel/pages/search/utils/groupSearchResultItems';
import {
  buildChatChannelSearchPath,
  CHAT_CHANNEL_SEARCH_GROUP_KEY,
  CHAT_MESSAGE_SEARCH_GROUP_KEY,
  mapChatSearchRecordsToResultItems,
} from '@/chat/utils/mapChatSearchRecordsToResultItems';

describe('buildChatChannelSearchPath', () => {
  it('should deep-link to the discussions page with the channel id', () => {
    expect(buildChatChannelSearchPath('channel-1')).toBe(
      getAppPath(AppPath.Discussions, undefined, { channelId: 'channel-1' }),
    );
  });
});

describe('mapChatSearchRecordsToResultItems', () => {
  it('should emit a channel item and a message item under distinct group keys', () => {
    const items = mapChatSearchRecordsToResultItems({
      channels: [
        {
          recordId: 'channel-1',
          label: 'General',
          objectNameSingular: 'chatChannel',
        },
      ],
      messages: [
        {
          recordId: 'message-1',
          label: 'hello world',
          objectNameSingular: 'chatMessage',
        },
      ],
    });

    expect(items).toHaveLength(2);

    const channelItem = items.find(
      (item) => item.groupKey === CHAT_CHANNEL_SEARCH_GROUP_KEY,
    );
    const messageItem = items.find(
      (item) => item.groupKey === CHAT_MESSAGE_SEARCH_GROUP_KEY,
    );

    expect(channelItem?.label).toBe('General');
    expect(channelItem?.path).toBe(buildChatChannelSearchPath('channel-1'));
    expect(messageItem?.label).toBe('hello world');
    expect(messageItem?.path).toBeUndefined();
  });

  it('should drop records with an empty label', () => {
    const items = mapChatSearchRecordsToResultItems({
      channels: [
        {
          recordId: 'channel-1',
          label: '',
          objectNameSingular: 'chatChannel',
        },
      ],
      messages: [
        {
          recordId: 'message-1',
          label: '',
          objectNameSingular: 'chatMessage',
        },
      ],
    });

    expect(items).toHaveLength(0);
  });

  it('should group through the shared P1.4 grouping pipeline', () => {
    const items = mapChatSearchRecordsToResultItems({
      channels: [
        {
          recordId: 'channel-1',
          label: 'General',
          objectNameSingular: 'chatChannel',
        },
      ],
      messages: [
        {
          recordId: 'message-1',
          label: 'hello world',
          objectNameSingular: 'chatMessage',
        },
      ],
    });

    const { groups } = groupSearchResultItems({
      items,
      frecencyRankByGroupKey: {},
    });

    expect(groups.map((group) => group.heading)).toEqual([
      'Discussions',
      'Messages',
    ]);
  });
});
