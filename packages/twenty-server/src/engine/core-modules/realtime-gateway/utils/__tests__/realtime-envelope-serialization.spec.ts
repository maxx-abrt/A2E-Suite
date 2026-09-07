import { isRealtimeClientMessage } from 'src/engine/core-modules/realtime-gateway/types/realtime-envelope.type';
import {
  buildRealtimeEnvelope,
  serializeRealtimeEnvelope,
} from 'src/engine/core-modules/realtime-gateway/utils/serialize-realtime-envelope.util';
import { parseRealtimeTopic } from 'src/engine/core-modules/realtime-gateway/utils/parse-realtime-topic.util';

describe('realtime envelope serialization', () => {
  it('serializes with topic, seq, type, payload keys in order', () => {
    expect(
      serializeRealtimeEnvelope({
        topic: 'workspace:1:chat:2',
        seq: 7,
        type: 'event',
        payload: { hello: 'world' },
      }),
    ).toBe(
      '{"topic":"workspace:1:chat:2","seq":7,"type":"event","payload":{"hello":"world"}}',
    );
  });

  it('builds event envelopes starting at seq 0', () => {
    expect(
      buildRealtimeEnvelope({ topic: 't', seq: 0, payload: null }),
    ).toEqual({
      topic: 't',
      seq: 0,
      type: 'event',
      payload: null,
    });
  });
});

describe('isRealtimeClientMessage', () => {
  it('accepts subscribe and unsubscribe messages', () => {
    expect(
      isRealtimeClientMessage({ action: 'subscribe', topic: 'workspace:1' }),
    ).toBe(true);
    expect(
      isRealtimeClientMessage({ action: 'unsubscribe', topic: 'workspace:1' }),
    ).toBe(true);
  });

  it('rejects malformed or unknown actions', () => {
    expect(isRealtimeClientMessage({ action: 'ping' })).toBe(false);
    expect(isRealtimeClientMessage({ action: 'subscribe' })).toBe(false);
    expect(isRealtimeClientMessage({ action: 'subscribe', topic: '' })).toBe(
      false,
    );
    expect(isRealtimeClientMessage('hello')).toBe(false);
    expect(isRealtimeClientMessage(null)).toBe(false);
  });
});

describe('parseRealtimeTopic', () => {
  it('parses the workspace-only topic', () => {
    expect(
      parseRealtimeTopic('workspace:20202020-1c25-4d02-bf25-6aeccf7ea419'),
    ).toEqual({
      kind: 'workspace',
      workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
    });
  });

  it('parses presence, chat, inbox and object topics', () => {
    const workspaceId = '20202020-1c25-4d02-bf25-6aeccf7ea419';

    expect(parseRealtimeTopic(`workspace:${workspaceId}:presence`)).toEqual({
      kind: 'presence',
      workspaceId,
    });
    expect(parseRealtimeTopic(`workspace:${workspaceId}:chat:abc`)).toEqual({
      kind: 'workspace',
      workspaceId,
      channelId: 'abc',
    });
    expect(parseRealtimeTopic(`workspace:${workspaceId}:inbox:user-1`)).toEqual(
      {
        kind: 'inbox',
        workspaceId,
        userId: 'user-1',
      },
    );
    expect(
      parseRealtimeTopic(`workspace:${workspaceId}:object:person:rec-1`),
    ).toEqual({
      kind: 'object',
      workspaceId,
      objectNameSingular: 'person',
      recordId: 'rec-1',
    });
  });

  it('throws on unknown kinds and malformed shapes', () => {
    expect(() => parseRealtimeTopic('workspace:not-a-uuid')).toThrow();
    expect(() =>
      parseRealtimeTopic('other:20202020-1c25-4d02-bf25-6aeccf7ea419'),
    ).toThrow();
    expect(() =>
      parseRealtimeTopic(
        'workspace:20202020-1c25-4d02-bf25-6aeccf7ea419:unknown-kind',
      ),
    ).toThrow();
    expect(() =>
      parseRealtimeTopic(
        'workspace:20202020-1c25-4d02-bf25-6aeccf7ea419:object',
      ),
    ).toThrow();
  });
});
