// The three watchable target kinds share one watch primitive; the value is
// persisted as-is and decides how a change event is resolved back to the
// watched target.
export const NOTIFICATION_WATCH_TARGET_KINDS = [
  'RECORD',
  'DOCUMENT',
  'CHANNEL',
] as const;

export type NotificationWatchTargetKind =
  (typeof NOTIFICATION_WATCH_TARGET_KINDS)[number];
