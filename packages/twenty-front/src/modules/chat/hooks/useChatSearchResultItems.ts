import { useMemo } from 'react';

import {
  CHAT_CHANNEL_OBJECT_NAME_SINGULAR,
  CHAT_MESSAGE_OBJECT_NAME_SINGULAR,
  mapChatSearchRecordsToResultItems,
} from '@/chat/utils/mapChatSearchRecordsToResultItems';
import { useObjectRecordSearchRecords } from '@/object-record/hooks/useObjectRecordSearchRecords';

import { type GroupableSearchResultItem } from '@/side-panel/pages/search/utils/groupSearchResultItems';

export const CHAT_SEARCH_RESULT_LIMIT = 5;

// Cmd+K chat provider. Channels and messages are app-owned metadata objects,
// so they are searched through the shared record-search primitive: it already
// no-ops when the object is not installed (a workspace without a2e-chat must
// not break Cmd+K), and its results join the same P1.4 grouping pipeline as
// core objects and app records.
export const useChatSearchResultItems = ({
  searchInput,
  skip,
}: {
  searchInput: string;
  skip: boolean;
}): {
  chatSearchResultItems: GroupableSearchResultItem[];
  loading: boolean;
} => {
  const { searchRecords: channels, loading: isChannelsLoading } =
    useObjectRecordSearchRecords({
      objectNameSingulars: [CHAT_CHANNEL_OBJECT_NAME_SINGULAR],
      searchInput,
      skip,
      limit: CHAT_SEARCH_RESULT_LIMIT,
    });

  const { searchRecords: messages, loading: isMessagesLoading } =
    useObjectRecordSearchRecords({
      objectNameSingulars: [CHAT_MESSAGE_OBJECT_NAME_SINGULAR],
      searchInput,
      skip,
      limit: CHAT_SEARCH_RESULT_LIMIT,
    });

  const chatSearchResultItems = useMemo<GroupableSearchResultItem[]>(
    () =>
      mapChatSearchRecordsToResultItems({
        channels,
        messages,
      }),
    [channels, messages],
  );

  return {
    chatSearchResultItems,
    loading: isChannelsLoading || isMessagesLoading,
  };
};
