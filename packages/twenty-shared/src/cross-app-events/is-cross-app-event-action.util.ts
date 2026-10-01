import { type CrossAppEventAction } from '@/cross-app-events/cross-app-event-action.type';
import { CROSS_APP_EVENT_ACTIONS } from '@/cross-app-events/cross-app-event-vocabulary.constant';

export const isCrossAppEventAction = (
  value: unknown,
): value is CrossAppEventAction =>
  typeof value === 'string' &&
  (CROSS_APP_EVENT_ACTIONS as readonly string[]).includes(value);
