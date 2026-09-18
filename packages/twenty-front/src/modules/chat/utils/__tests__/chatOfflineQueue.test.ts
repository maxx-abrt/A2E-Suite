import { type RealtimeOfflineQueueEntry } from '~/modules/realtime/states/realtimeOfflineQueueState';

import {
  isPendingChatMessagePayload,
  orderChatOfflineQueueEntries,
} from '@/chat/utils/chatOfflineQueue';

const buildEntry = (
  id: string,
  createdAtIso: string,
  payload: unknown,
): RealtimeOfflineQueueEntry => ({
  id,
  namespace: 'chat',
  createdAtIso,
  payload,
});

describe('isPendingChatMessagePayload', () => {
  it('should accept a null threadParentId', () => {
    expect(
      isPendingChatMessagePayload({
        channelId: 'channel-1',
        body: 'hello',
        threadParentId: null,
      }),
    ).toBe(true);
  });

  it('should reject an empty channelId and malformed payloads', () => {
    expect(
      isPendingChatMessagePayload({
        channelId: '',
        body: 'hello',
        threadParentId: null,
      }),
    ).toBe(false);
    expect(isPendingChatMessagePayload({ channelId: 'channel-1' })).toBe(false);
    expect(isPendingChatMessagePayload(null)).toBe(false);
  });
});

describe('orderChatOfflineQueueEntries', () => {
  it('should flush oldest-first regardless of insertion order', () => {
    const ordered = orderChatOfflineQueueEntries([
      buildEntry('b', '2026-01-01T02:00:00.000Z', {
        channelId: 'channel-1',
        body: 'second',
        threadParentId: null,
      }),
      buildEntry('a', '2026-01-01T01:00:00.000Z', {
        channelId: 'channel-1',
        body: 'first',
        threadParentId: null,
      }),
    ]);

    expect(ordered.map((entry) => entry.payload.body)).toEqual([
      'first',
      'second',
    ]);
  });

  it('should keep insertion order when timestamps tie', () => {
    const ordered = orderChatOfflineQueueEntries([
      buildEntry('z', '2026-01-01T01:00:00.000Z', {
        channelId: 'channel-1',
        body: 'typed-first',
        threadParentId: null,
      }),
      buildEntry('a', '2026-01-01T01:00:00.000Z', {
        channelId: 'channel-1',
        body: 'typed-second',
        threadParentId: null,
      }),
    ]);

    expect(ordered.map((entry) => entry.payload.body)).toEqual([
      'typed-first',
      'typed-second',
    ]);
  });

  it('should drop entries whose payload is not a chat message', () => {
    const ordered = orderChatOfflineQueueEntries([
      buildEntry('a', '2026-01-01T01:00:00.000Z', {
        channelId: 'channel-1',
        body: 'first',
        threadParentId: null,
      }),
      buildEntry('b', '2026-01-01T02:00:00.000Z', { someOther: 'payload' }),
    ]);

    expect(ordered).toHaveLength(1);
    expect(ordered[0].entryId).toBe('a');
  });
});
