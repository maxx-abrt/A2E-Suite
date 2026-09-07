import { z } from 'zod';

import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// Offline composer queue primitive for P5 (chat) / P8 (inbox): mutations
// composed while the realtime status is not 'connected' are parked here and
// drained by the owning feature on reconnect. Queue entries are feature-
// namespaced so chat and inbox never drain each other's items.
export type RealtimeOfflineQueueEntry = {
  id: string;
  namespace: string;
  createdAtIso: string;
  payload: unknown;
};

const realtimeOfflineQueueEntrySchema = z.object({
  id: z.string().min(1),
  namespace: z.string().min(1),
  createdAtIso: z.string().min(1),
  payload: z.unknown(),
});

export const isRealtimeOfflineQueueEntry = (
  value: unknown,
): value is RealtimeOfflineQueueEntry =>
  realtimeOfflineQueueEntrySchema.safeParse(value).success;

export const realtimeOfflineQueueState = createAtomState<
  RealtimeOfflineQueueEntry[]
>({
  key: 'realtimeOfflineQueueState',
  defaultValue: [],
  useLocalStorage: true,
  validateInitFn: (payload) =>
    Array.isArray(payload) && payload.every(isRealtimeOfflineQueueEntry),
  localStorageOptions: { getOnInit: true },
});
