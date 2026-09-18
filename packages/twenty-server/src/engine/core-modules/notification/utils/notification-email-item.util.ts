import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { type NotificationEmailItem } from 'twenty-emails';

import { type NotificationType } from 'src/engine/core-modules/notification/constants/notification-type.constant';
import { type NotificationDigestItem } from 'src/engine/core-modules/notification/utils/group-notifications-into-digest-batches.util';

// Labels mirror the inbox item labels so the email and the inbox name the same
// event the same way; the email package receives the resolved string and stays
// unaware of the notification taxonomy.
const NOTIFICATION_EMAIL_LABEL_BY_TYPE: Record<
  NotificationType,
  MessageDescriptor
> = {
  MENTION: msg`You were mentioned`,
  CHAT_MESSAGE: msg`New message`,
  ASSIGNED: msg`Assigned to you`,
  WATCHED_RECORD_CHANGED: msg`A watched record changed`,
  BUDGET_ALERT: msg`A budget threshold was reached`,
  INVOICE_OVERDUE: msg`An invoice is overdue`,
  PAYMENT_RECEIVED: msg`A payment was received`,
  SYSTEM: msg`System notification`,
};

export const getNotificationEmailLabel = (type: string): MessageDescriptor =>
  NOTIFICATION_EMAIL_LABEL_BY_TYPE[type as NotificationType] ??
  msg`Notification`;

// Producers write free-form payloads; the inbox previews the same first
// non-empty string field, so the email body falls back through the same keys.
const PREVIEW_PAYLOAD_KEYS = ['preview', 'snippet', 'title'];

export const extractNotificationEmailPreview = (
  payload: Record<string, unknown> | null,
): string | null => {
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

// Pure projection: the caller injects the translator so this stays testable
// without a lingui instance and the same email content is built for any locale.
export const buildNotificationEmailItems = ({
  digestItems,
  translate,
}: {
  digestItems: NotificationDigestItem[];
  translate: (label: MessageDescriptor) => string;
}): NotificationEmailItem[] =>
  digestItems.map((digestItem) => ({
    title: translate(getNotificationEmailLabel(digestItem.type)),
    preview: extractNotificationEmailPreview(digestItem.payload),
  }));
