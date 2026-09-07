import { useCallback } from 'react';

import { isDefined } from 'twenty-shared/utils';
import { v4 } from 'uuid';

import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

import { type RealtimeOfflineQueueEntry } from '~/modules/realtime/states/realtimeOfflineQueueState';
import { realtimeOfflineQueueState } from '~/modules/realtime/states/realtimeOfflineQueueState';

export const useRealtimeOfflineQueue = (namespace: string) => {
  const setQueue = useSetAtomState(realtimeOfflineQueueState);
  const entries = useAtomStateValue(realtimeOfflineQueueState);

  const enqueue = useCallback(
    (payload: unknown) => {
      const entry: RealtimeOfflineQueueEntry = {
        id: v4(),
        namespace,
        createdAtIso: new Date().toISOString(),
        payload,
      };

      setQueue((previousEntries) => [...previousEntries, entry]);
    },
    [namespace, setQueue],
  );

  const drain = useCallback(
    (onEntry: (entry: RealtimeOfflineQueueEntry) => Promise<void> | void) => {
      setQueue((previousEntries) => {
        const namespaceEntries = previousEntries.filter(
          (entry) => entry.namespace === namespace,
        );

        for (const entry of namespaceEntries) {
          void onEntry(entry);
        }

        return previousEntries.filter((entry) => entry.namespace !== namespace);
      });
    },
    [namespace, setQueue],
  );

  const clear = useCallback(() => {
    setQueue((previousEntries) =>
      previousEntries.filter((entry) => entry.namespace !== namespace),
    );
  }, [namespace, setQueue]);

  const namespaceEntries = isDefined(entries)
    ? entries.filter((entry) => entry.namespace === namespace)
    : [];

  return { entries: namespaceEntries, enqueue, drain, clear };
};
