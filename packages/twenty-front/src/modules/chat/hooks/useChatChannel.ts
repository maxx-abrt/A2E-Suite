import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';

import { type ChatChannel } from '@/chat/types/ChatChannel';

// Reads one channel by id for surfaces that are not the full channel list
// (the record side-panel mini-chat). App-owned metadata object, so it goes
// through the shared object-record machinery like useChatChannels.
export const useChatChannel = ({ channelId }: { channelId: string | null }) => {
  const { record, loading, error } = useFindOneRecord({
    objectNameSingular: 'chatChannel',
    objectRecordId: channelId ?? undefined,
    skip: channelId === null,
    recordGqlFields: {
      id: true,
      name: true,
      kind: true,
      visibility: true,
      topic: true,
    },
  });

  return {
    channel: (record as unknown as ChatChannel | null) ?? null,
    loading,
    error,
  };
};
