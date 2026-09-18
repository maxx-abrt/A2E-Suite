import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

import { type ChatChannel } from '@/chat/types/ChatChannel';

// Channels are app-owned metadata objects, so they are read through the shared
// object-record machinery (native-law §4) rather than a bespoke query.
export const useChatChannels = () => {
  const { records, loading, error } = useFindManyRecords({
    objectNameSingular: 'chatChannel',
    recordGqlFields: {
      id: true,
      name: true,
      kind: true,
      visibility: true,
      topic: true,
    },
    limit: 200,
  });

  return {
    channels: records as unknown as ChatChannel[],
    loading,
    error,
  };
};
