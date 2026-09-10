import { useEffect } from 'react';

import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

import { realtimeConnectionStatusState } from '~/modules/realtime/states/realtimeConnectionStatusState';
import { realtimeConnectionManager } from '~/modules/realtime/utils/realtimeConnectionManager';

// Mount once near the app root (banner, badge) to mirror the manager status
// into the jotai atom the rest of the UI reads.
export const useRealtimeConnectionStatus = (): {
  status: ReturnType<typeof realtimeConnectionManager.getStatus>;
} => {
  const setRealtimeConnectionStatus = useSetAtomState(
    realtimeConnectionStatusState,
  );
  const realtimeConnectionStatus = useAtomStateValue(
    realtimeConnectionStatusState,
  );

  useEffect(() => {
    const unsubscribe = realtimeConnectionManager.onStatusChange(
      setRealtimeConnectionStatus,
    );

    return unsubscribe;
  }, [setRealtimeConnectionStatus]);

  return { status: realtimeConnectionStatus };
};
