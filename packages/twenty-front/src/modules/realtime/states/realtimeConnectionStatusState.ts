import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export type RealtimeConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export const realtimeConnectionStatusState =
  createAtomState<RealtimeConnectionStatus>({
    key: 'realtimeConnectionStatusState',
    defaultValue: 'disconnected',
  });
