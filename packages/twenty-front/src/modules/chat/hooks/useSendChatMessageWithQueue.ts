import { useCallback, useEffect, useState } from 'react';

import {
  CHAT_OFFLINE_QUEUE_NAMESPACE,
  orderChatOfflineQueueEntries,
  type PendingChatMessagePayload,
} from '@/chat/utils/chatOfflineQueue';
import { useRealtimeConnectionStatus } from '~/modules/realtime/hooks/useRealtimeConnectionStatus';
import { useRealtimeOfflineQueue } from '~/modules/realtime/hooks/useRealtimeOfflineQueue';

// Composer durability: while the socket is not 'connected', a send is parked
// in the P2.2 namespaced queue instead of being lost, and replayed in typed
// order on reconnect. The drain stays idempotent because the message pane's
// reducer inserts by id.
export const useSendChatMessageWithQueue = ({
  sendChatMessage,
}: {
  sendChatMessage: (payload: PendingChatMessagePayload) => Promise<void>;
}) => {
  const { status } = useRealtimeConnectionStatus();
  const { entries, enqueue, clear } = useRealtimeOfflineQueue(
    CHAT_OFFLINE_QUEUE_NAMESPACE,
  );
  const [isDraining, setIsDraining] = useState(false);

  const submitChatMessage = useCallback(
    async (payload: PendingChatMessagePayload) => {
      if (status !== 'connected') {
        enqueue(payload);

        return;
      }

      await sendChatMessage(payload);
    },
    [enqueue, sendChatMessage, status],
  );

  // Flush on reconnect (and on mount when already connected). Entries are
  // ordered before the network calls so the conversation keeps typing order;
  // `clear` runs first so a send that fails mid-drain does not re-queue what
  // already succeeded.
  useEffect(() => {
    if (status !== 'connected' || entries.length === 0 || isDraining) {
      return;
    }

    const orderedEntries = orderChatOfflineQueueEntries(entries);

    setIsDraining(true);
    clear();

    void (async () => {
      for (const entry of orderedEntries) {
        await sendChatMessage(entry.payload);
      }

      setIsDraining(false);
    })();
  }, [clear, entries, isDraining, sendChatMessage, status]);

  return { submitChatMessage, pendingCount: entries.length };
};
