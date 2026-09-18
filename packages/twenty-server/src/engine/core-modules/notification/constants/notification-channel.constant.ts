export const NOTIFICATION_CHANNELS = ['INBOX', 'EMAIL', 'NONE'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
