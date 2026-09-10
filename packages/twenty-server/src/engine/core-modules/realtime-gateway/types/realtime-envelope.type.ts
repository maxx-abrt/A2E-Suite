import { type ZodType, z } from 'zod';

// Envelope contract shared with the front client; validated on both sides so
// a bad payload can never reach a consumer hook.
export type RealtimeEnvelopeType = 'event' | 'ack' | 'error';

export type RealtimeEnvelope = {
  topic: string;
  seq: number;
  type: RealtimeEnvelopeType;
  payload: unknown;
};

export type RealtimePublishInput = {
  topic: string;
  payload: unknown;
};

export const realtimeEnvelopeSchema: ZodType<RealtimeEnvelope> = z.object({
  topic: z.string().min(1),
  seq: z.number().int().nonnegative(),
  type: z.enum(['event', 'ack', 'error']),
  payload: z.unknown(),
});

export const realtimeSubscribeMessageSchema = z.object({
  action: z.literal('subscribe'),
  topic: z.string().min(1),
  token: z.string().min(1).optional(),
});

export const realtimeUnsubscribeMessageSchema = z.object({
  action: z.literal('unsubscribe'),
  topic: z.string().min(1),
});

export const realtimePresenceMessageSchema = z.object({
  action: z.literal('presence'),
  topic: z.string().min(1),
  event: z.enum(['heartbeat', 'typing-started', 'typing-stopped']),
  typingContext: z.string().trim().min(1).max(200).optional(),
});

export type RealtimeSubscribeMessage = z.infer<
  typeof realtimeSubscribeMessageSchema
>;

export type RealtimeUnsubscribeMessage = z.infer<
  typeof realtimeUnsubscribeMessageSchema
>;

export type RealtimePresenceMessage = z.infer<
  typeof realtimePresenceMessageSchema
>;

export type RealtimeClientMessage =
  | RealtimeSubscribeMessage
  | RealtimeUnsubscribeMessage
  | RealtimePresenceMessage;

export const isRealtimeClientMessage = (
  value: unknown,
): value is RealtimeClientMessage => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const action = (value as { action?: unknown }).action;

  if (action === 'subscribe') {
    return realtimeSubscribeMessageSchema.safeParse(value).success;
  }

  if (action === 'unsubscribe') {
    return realtimeUnsubscribeMessageSchema.safeParse(value).success;
  }

  if (action === 'presence') {
    return realtimePresenceMessageSchema.safeParse(value).success;
  }

  return false;
};
