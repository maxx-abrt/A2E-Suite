import { type CrossAppEventAction } from '@/cross-app-events/cross-app-event-action.type';
import { type CrossAppEventObjectFamily } from '@/cross-app-events/cross-app-event-object-family.type';

// Stable lifecycle event name: `<objectFamily>.<action>`. It is the single
// vocabulary shared by the notification path and the recipe trigger side — no
// per-pair event names.
export type CrossAppEventName =
  `${CrossAppEventObjectFamily}.${CrossAppEventAction}`;
