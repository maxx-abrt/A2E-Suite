import { type CrossAppEventPayload } from '@/cross-app-events/cross-app-event-payload.type';
import { CROSS_APP_EVENT_CONTRACT_VERSION } from '@/cross-app-events/cross-app-event-vocabulary.constant';
import { isCrossAppEventAction } from '@/cross-app-events/is-cross-app-event-action.util';
import { isCrossAppEventObjectFamily } from '@/cross-app-events/is-cross-app-event-object-family.util';

// Runtime shape check for consumers (notifications, recipes) that receive an
// event from the bus and must not trust it blindly. Kept structural rather than
// class-based so it accepts the serialized payload over a queue.
export const isCrossAppEventPayload = (
  value: unknown,
): value is CrossAppEventPayload => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.contractVersion === CROSS_APP_EVENT_CONTRACT_VERSION &&
    typeof candidate.name === 'string' &&
    typeof candidate.workspaceId === 'string' &&
    isCrossAppEventObjectFamily(candidate.objectFamily) &&
    isCrossAppEventAction(candidate.action) &&
    candidate.name === `${candidate.objectFamily}.${candidate.action}` &&
    typeof candidate.recordId === 'string' &&
    typeof candidate.actor === 'object' &&
    candidate.actor !== null &&
    typeof candidate.timestamps === 'object' &&
    candidate.timestamps !== null
  );
};
