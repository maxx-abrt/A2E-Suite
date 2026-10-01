import { type CrossAppEventObjectFamily } from '@/cross-app-events/cross-app-event-object-family.type';
import { CROSS_APP_EVENT_OBJECT_FAMILIES } from '@/cross-app-events/cross-app-event-vocabulary.constant';

export const isCrossAppEventObjectFamily = (
  value: unknown,
): value is CrossAppEventObjectFamily =>
  typeof value === 'string' &&
  (CROSS_APP_EVENT_OBJECT_FAMILIES as readonly string[]).includes(value);
