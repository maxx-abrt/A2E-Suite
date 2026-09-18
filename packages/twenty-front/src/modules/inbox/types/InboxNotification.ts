export type InboxNotificationPayload = Record<string, unknown> | null;

export type InboxNotification = {
  id: string;
  type: string;
  payload: InboxNotificationPayload;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
};

// The four inbox filter tabs. A category maps to one or more persisted
// notification types in `filterInboxNotificationsByCategory`.
export type InboxNotificationCategory =
  | 'all'
  | 'mentions'
  | 'assigned'
  | 'watching';
