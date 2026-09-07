import { act, renderHook, waitFor } from '@testing-library/react';

import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

import { realtimeOfflineQueueState } from '~/modules/realtime/states/realtimeOfflineQueueState';
import { useRealtimeOfflineQueue } from '~/modules/realtime/hooks/useRealtimeOfflineQueue';

describe('useRealtimeOfflineQueue', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jotaiStore.set(realtimeOfflineQueueState.atom, []);
  });

  it('enqueues and drains only its own namespace', async () => {
    const { result, rerender } = renderHook(() =>
      useRealtimeOfflineQueue('chat'),
    );

    act(() => {
      result.current.enqueue({ body: 'hello' });
    });

    rerender();

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });

    const inbox = renderHook(() => useRealtimeOfflineQueue('inbox'));

    expect(inbox.result.current.entries).toHaveLength(0);

    const drained: unknown[] = [];

    act(() => {
      result.current.drain((entry) => {
        drained.push(entry.payload);
      });
    });

    expect(drained).toEqual([{ body: 'hello' }]);
    expect(result.current.entries).toHaveLength(0);
  });

  it('clear removes the namespace entries', () => {
    const { result } = renderHook(() => useRealtimeOfflineQueue('chat'));

    act(() => {
      result.current.enqueue({ body: 'a' });
      result.current.enqueue({ body: 'b' });
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.entries).toHaveLength(0);
  });
});
