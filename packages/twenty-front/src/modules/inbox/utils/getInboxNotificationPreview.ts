import { type InboxNotification } from '@/inbox/types/InboxNotification';

// Producers vary in which key carries the human-readable excerpt (chat adds
// `snippet`, watch payloads may carry `title`), so accept the first present
// rather than pinning the inbox to one producer's payload shape.
const PREVIEW_PAYLOAD_KEYS = ['preview', 'snippet', 'title'];

export const getInboxNotificationPreview = (
  notification: InboxNotification,
): string | null => {
  const payload = notification.payload;

  if (payload === null) {
    return null;
  }

  for (const key of PREVIEW_PAYLOAD_KEYS) {
    const value = payload[key];

    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return null;
};
