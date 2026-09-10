import { act, renderHook, waitFor } from '@testing-library/react';

import {
  createRealtimeMockServerHarness,
  type RealtimeMockServerHarness,
} from '~/modules/realtime/testing/RealtimeMockServerHarness';
import { useRealtimeTopic } from '~/modules/realtime/hooks/useRealtimeTopic';
import { realtimeConnectionManager } from '~/modules/realtime/utils/realtimeConnectionManager';

describe('useRealtimeTopic', () => {
  let harness: RealtimeMockServerHarness;

  beforeEach(() => {
    harness = createRealtimeMockServerHarness();
    harness.install(realtimeConnectionManager);
  });

  afterEach(() => {
    realtimeConnectionManager.destroy();
  });

  it('sends a subscribe message and receives events on the subscribed topic', async () => {
    const onEvent = jest.fn();

    const { result } = renderHook(() =>
      useRealtimeTopic<{ value: string }>({
        topic: 'workspace:1:presence',
        onEvent,
      }),
    );

    await waitFor(() => {
      expect(harness.getLastSentMessage()).toContain('workspace:1:presence');
    });

    expect(JSON.parse(harness.getLastSentMessage() ?? '{}')).toMatchObject({
      action: 'subscribe',
      topic: 'workspace:1:presence',
    });

    act(() => {
      harness.broadcast('workspace:1:presence', { value: 'hello' });
    });

    await waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith(
        { value: 'hello' },
        expect.objectContaining({ type: 'event' }),
      );
      expect(result.current.lastEnvelope?.payload).toEqual({ value: 'hello' });
    });
  });

  it('publishes typing presence only for a live subscribed topic', async () => {
    renderHook(() => useRealtimeTopic({ topic: 'workspace:1:presence' }));

    await waitFor(() => {
      expect(harness.getLastSentMessage()).toContain('workspace:1:presence');
    });

    expect(
      realtimeConnectionManager.sendPresence({
        topic: 'workspace:1:presence',
        event: 'typing-started',
        typingContext: 'record:company:1',
      }),
    ).toBe(true);
    expect(JSON.parse(harness.getLastSentMessage() ?? '{}')).toEqual({
      action: 'presence',
      topic: 'workspace:1:presence',
      event: 'typing-started',
      typingContext: 'record:company:1',
    });
    expect(
      realtimeConnectionManager.sendPresence({
        topic: 'workspace:1:not-subscribed',
        event: 'heartbeat',
      }),
    ).toBe(false);
  });

  it('ignores events for other topics', async () => {
    const onEvent = jest.fn();

    renderHook(() =>
      useRealtimeTopic({ topic: 'workspace:1:presence', onEvent }),
    );

    await waitFor(() => {
      expect(harness.getLastSentMessage()).toContain('workspace:1:presence');
    });

    act(() => {
      harness.broadcast('workspace:2:presence', { nope: true });
    });

    // Drain the microtask queue; the wrong-topic event must not surface.
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('re-subscribes after a reconnect', async () => {
    const onEvent = jest.fn();

    renderHook(() =>
      useRealtimeTopic({ topic: 'workspace:1:presence', onEvent }),
    );

    await waitFor(() => {
      expect(harness.getLastSentMessage()).toContain('workspace:1:presence');
    });

    harness.terminateClient();

    // Backoff reconnect is scheduled at +500ms; wait for the resubscribe.
    await waitFor(
      () => {
        const subscribeMessages = harness
          .getSentMessages()
          .filter((message) => message.includes('subscribe'));

        expect(subscribeMessages.length).toBeGreaterThan(1);
      },
      { timeout: 8000 },
    );

    act(() => {
      harness.broadcast('workspace:1:presence', { after: 'reconnect' });
    });

    await waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith(
        { after: 'reconnect' },
        expect.anything(),
      );
    });
  });
});
