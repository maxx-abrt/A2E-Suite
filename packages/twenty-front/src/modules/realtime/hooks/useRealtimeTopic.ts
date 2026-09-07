import { useEffect, useState } from 'react';

import { isDefined } from 'twenty-shared/utils';

import { type RealtimeEnvelope } from '~/modules/realtime/utils/RealtimeConnectionManager';
import { realtimeConnectionManager } from '~/modules/realtime/utils/RealtimeConnectionManager';

// Reconnect catch-up is the consumer's job: on reconnect the manager resends
// subscriptions, and the hook replays the `sinceSeq` marker via the callback
// so consumers can hydrate what they missed (REST/GraphQL) — at-most-once
// delivery per the blueprint.
export const useRealtimeTopic = <TPayload>({
  topic,
  onEvent,
}: {
  topic: string;
  onEvent?: (payload: TPayload, envelope: RealtimeEnvelope) => void;
}): { lastEnvelope: RealtimeEnvelope | null } => {
  const [lastEnvelope, setLastEnvelope] = useState<RealtimeEnvelope | null>(
    null,
  );

  useEffect(() => {
    const unsubscribe = realtimeConnectionManager.subscribe(
      topic,
      (envelope) => {
        setLastEnvelope(envelope);

        if (isDefined(onEvent)) {
          onEvent(envelope.payload as TPayload, envelope);
        }
      },
    );

    return unsubscribe;
    // onEvent is intentionally not a dependency: consumers pass inline
    // closures that would otherwise resubscribe on every render.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  return { lastEnvelope };
};
