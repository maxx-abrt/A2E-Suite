import { type RealtimeOfflineQueueEntry } from '~/modules/realtime/states/realtimeOfflineQueueState';

// Payload parked by the chat composer while the realtime connection is down.
// The namespace is shared with `useRealtimeOfflineQueue`; the shape is chat's
// own, so a drain knows exactly what it is replaying.
export type PendingChatMessagePayload = {
  channelId: string;
  body: string;
  threadParentId: string | null;
};

export const CHAT_OFFLINE_QUEUE_NAMESPACE = 'chat';

export const isPendingChatMessagePayload = (
  payload: unknown,
): payload is PendingChatMessagePayload => {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const candidate = payload as Partial<PendingChatMessagePayload>;

  return (
    typeof candidate.channelId === 'string' &&
    candidate.channelId.length > 0 &&
    typeof candidate.body === 'string' &&
    (candidate.threadParentId === null ||
      typeof candidate.threadParentId === 'string')
  );
};

export type FlushableChatMessage = {
  entryId: string;
  createdAtIso: string;
  payload: PendingChatMessagePayload;
};

// Draining a namespace is FIFO by `createdAtIso`, falling back to the queue's
// insertion order on a timestamp tie (two sends usually land in the same
// millisecond). `sort` is stable, so mapping to the original index before
// sorting keeps typed order exact. Entries whose payload no longer matches the
// chat shape are dropped by the caller, never partially sent.
export const orderChatOfflineQueueEntries = (
  entries: RealtimeOfflineQueueEntry[],
): FlushableChatMessage[] =>
  entries
    .map((entry, insertionIndex) => ({ entry, insertionIndex }))
    .filter(({ entry }) => isPendingChatMessagePayload(entry.payload))
    .sort(
      (firstEntry, secondEntry) =>
        firstEntry.entry.createdAtIso.localeCompare(
          secondEntry.entry.createdAtIso,
        ) || firstEntry.insertionIndex - secondEntry.insertionIndex,
    )
    .map(({ entry }) => ({
      entryId: entry.id,
      createdAtIso: entry.createdAtIso,
      payload: entry.payload as PendingChatMessagePayload,
    }));
