import { type CrossAppEventAction } from '@/cross-app-events/cross-app-event-action.type';
import { type CrossAppEventActor } from '@/cross-app-events/cross-app-event-actor.type';
import { type CrossAppEventName } from '@/cross-app-events/cross-app-event-name.type';
import { type CrossAppEventObjectFamily } from '@/cross-app-events/cross-app-event-object-family.type';
import { type CrossAppEventTimestamps } from '@/cross-app-events/cross-app-event-timestamps.type';

// The one payload convention every A2E lifecycle emission conforms to (C5).
// `record` carries the before/after snapshot so a consumer that needs fields
// (recipes) does not re-read the row, while pure notification consumers can
// ignore it.
export type CrossAppEventPayload<TRecord = Record<string, unknown>> = {
  contractVersion: number;
  name: CrossAppEventName;
  workspaceId: string;
  objectFamily: CrossAppEventObjectFamily;
  action: CrossAppEventAction;
  recordId: string;
  actor: CrossAppEventActor;
  timestamps: CrossAppEventTimestamps;
  record: TRecord;
};
