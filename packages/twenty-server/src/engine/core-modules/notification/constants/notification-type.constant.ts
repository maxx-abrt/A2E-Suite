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
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
