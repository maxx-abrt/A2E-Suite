import { type CrossAppEventAction } from '@/cross-app-events/cross-app-event-action.type';
import { type CrossAppEventName } from '@/cross-app-events/cross-app-event-name.type';
import { type CrossAppEventObjectFamily } from '@/cross-app-events/cross-app-event-object-family.type';

export const computeCrossAppEventName = (
  objectFamily: CrossAppEventObjectFamily,
  action: CrossAppEventAction,
): CrossAppEventName => `${objectFamily}.${action}`;
