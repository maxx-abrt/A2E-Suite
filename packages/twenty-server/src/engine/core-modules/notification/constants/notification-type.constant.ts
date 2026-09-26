// Producers emit one of these types; the value is persisted as-is in the
// notification row and is the key a user's channel preference is looked up by.
export const NOTIFICATION_TYPES = [
  'MENTION',
  'CHAT_MESSAGE',
  'ASSIGNED',
  'WATCHED_RECORD_CHANGED',
  'BUDGET_ALERT',
  'INVOICE_OVERDUE',
  'PAYMENT_RECEIVED',
  'SYSTEM',
  // P4C.4: a calendar event reminder is due (startsAt − reminderMinutes ≤ now).
  // Delivery is idempotent via reminderDeliveredAt; quiet-hours follow the P8
  // user preference; D05 open decision governs attendee timezone policy.
  'CALENDAR_REMINDER',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
