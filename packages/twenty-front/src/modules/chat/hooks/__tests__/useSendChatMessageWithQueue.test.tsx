import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

import { useSendChatMessageWithQueue } from '@/chat/hooks/useSendChatMessageWithQueue';
import { realtimeOfflineQueueState } from '~/modules/realtime/states/realtimeOfflineQueueState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

const mockStatusRef = { current: 'disconnected' as string };

jest.mock('~/modules/realtime/hooks/useRealtimeConnectionStatus', () => ({
  useRealtimeConnectionStatus: () => ({ status: mockStatusRef.current }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
);

describe('useSendChatMessageWithQueue', () => {
  beforeEach(() => {
    mockStatusRef.current = 'disconnected';
    window.localStorage.clear();
    jotaiStore.set(realtimeOfflineQueueState.atom, []);
  });

  it('should park a send while offline and flush it in typed order on reconnect', async () => {
    const sentBodies: string[] = [];
    const sendChatMessage = jest.fn(async ({ body }: { body: string }) => {
      sentBodies.push(body);
    });

    const { result, rerender } = renderHook(
      () => useSendChatMessageWithQueue({ sendChatMessage }),
      { wrapper },
    );

    await act(async () => {
      await result.current.submitChatMessage({
        channelId: 'channel-1',
        body: 'first',
        threadParentId: null,
      });
      await result.current.submitChatMessage({
        channelId: 'channel-1',
        body: 'second',
        threadParentId: null,
      });
    });

    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(result.current.pendingCount).toBe(2);

    mockStatusRef.current = 'connected';

    // Re-render with the new status so the flush effect runs.
    rerender();

    await waitFor(() => {
      expect(sentBodies).toEqual(['first', 'second']);
    });

    expect(result.current.pendingCount).toBe(0);
  });

  it('should send immediately while connected', async () => {
    mockStatusRef.current = 'connected';

    const sendChatMessage = jest.fn(async () => {});

    const { result } = renderHook(
      () => useSendChatMessageWithQueue({ sendChatMessage }),
      { wrapper },
    );

    await act(async () => {
      await result.current.submitChatMessage({
        channelId: 'channel-1',
        body: 'live',
        threadParentId: null,
      });
    });

    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(result.current.pendingCount).toBe(0);
  });
});
