import { useEffect } from 'react';

import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

import { realtimeConnectionStatusState } from '~/modules/realtime/states/realtimeConnectionStatusState';
import { realtimeConnectionManager } from '~/modules/realtime/utils/RealtimeConnectionManager';

// Mount once near the app root (banner, badge) to mirror the manager status
// into the jotai atom the rest of the UI reads.
export const useRealtimeConnectionStatus = (): {
  status: ReturnType<typeof realtimeConnectionManager.getStatus>;
} => {
  const setStatus = useSetAtomState(realtimeConnectionStatusState);
  const status = useAtomStateValue(realtimeConnectionStatusState);

  useEffect(() => {
    const unsubscribe = realtimeConnectionManager.onStatusChange(setStatus);

    return unsubscribe;
  }, [setStatus]);

  return { status };
};
