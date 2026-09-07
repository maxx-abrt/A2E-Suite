import { isDefined } from 'twenty-shared/utils';

import {
  type RealtimeEnvelope,
  type RealtimePublishInput,
} from '../types/realtime-envelope.type';

export const serializeRealtimeEnvelope = ({
  topic,
  seq,
  type,
  payload,
}: RealtimeEnvelope): string => JSON.stringify({ topic, seq, type, payload });

export const buildRealtimeEnvelope = ({
  topic,
  seq,
  payload,
}: {
  topic: string;
  seq: number;
  payload: unknown;
}): RealtimeEnvelope => ({
  topic,
  seq,
  type: 'event',
  payload,
});

export const buildRealtimeEnvelopeFromPublishInput = ({
  topic,
  payload,
}: RealtimePublishInput): RealtimeEnvelope | undefined => {
  if (!isDefined(payload)) {
    return undefined;
  }

  return buildRealtimeEnvelope({ topic, seq: 0, payload });
};
