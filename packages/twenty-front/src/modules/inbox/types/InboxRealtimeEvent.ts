import { type InboxNotification } from '@/inbox/types/InboxNotification';

// Mirror of the server `notification-realtime-event.util.ts` payload fanned out
// on `workspace:<id>:inbox:<userId>`. Kept local because the events are produced
// by the server core module, not the metadata codegen surface (ChatRealtimeEvent
// precedent).
export const INBOX_UPDATED_EVENT_TYPE = 'notification.inbox.updated';

export type InboxRealtimeEvent = {
  type: typeof INBOX_UPDATED_EVENT_TYPE;
  workspaceId: string;
  userId: string;
  occurredAt: string;
  unreadCount: number;
  notifications: InboxNotification[];
};
