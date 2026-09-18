// Custom event all producers emit instead of writing notification rows
// themselves: it keeps one inbox (and one preference/quiet-hours policy) for
// every app, so a producer never depends on the notification table.
export const NOTIFICATION_REQUESTED = 'notification_requested';
