import { type CrossAppEventAction } from '@/cross-app-events/cross-app-event-action.type';
import { type CrossAppEventActor } from '@/cross-app-events/cross-app-event-actor.type';
import { type CrossAppEventPayload } from '@/cross-app-events/cross-app-event-payload.type';
import { type CrossAppEventTimestamps } from '@/cross-app-events/cross-app-event-timestamps.type';
import { type CrossAppEventObjectFamily } from '@/cross-app-events/cross-app-event-object-family.type';
import { CROSS_APP_EVENT_CONTRACT_VERSION } from '@/cross-app-events/cross-app-event-vocabulary.constant';
import { computeCrossAppEventName } from '@/cross-app-events/compute-cross-app-event-name.util';

export type BuildCrossAppEventPayloadInput<TRecord = Record<string, unknown>> =
  {
    objectFamily: CrossAppEventObjectFamily;
    action: CrossAppEventAction;
    workspaceId: string;
    recordId: string;
    actor: CrossAppEventActor;
    timestamps: CrossAppEventTimestamps;
    record: TRecord;
  };

export const buildCrossAppEventPayload = <TRecord = Record<string, unknown>>(
  input: BuildCrossAppEventPayloadInput<TRecord>,
): CrossAppEventPayload<TRecord> => ({
  contractVersion: CROSS_APP_EVENT_CONTRACT_VERSION,
  name: computeCrossAppEventName(input.objectFamily, input.action),
  workspaceId: input.workspaceId,
  objectFamily: input.objectFamily,
  action: input.action,
  recordId: input.recordId,
  actor: input.actor,
  timestamps: input.timestamps,
  record: input.record,
});
