import {
  type InboxNotification,
  type InboxNotificationCategory,
} from '@/inbox/types/InboxNotification';

// Category → persisted notification types. `all` has no type filter.
const INBOX_CATEGORY_TYPES: Record<
  Exclude<InboxNotificationCategory, 'all'>,
  string[]
> = {
  mentions: ['MENTION'],
  assigned: ['ASSIGNED'],
  watching: ['WATCHED_RECORD_CHANGED'],
};

export const getInboxCategoryTypes = (
  category: InboxNotificationCategory,
): string[] | null =>
  category === 'all' ? null : INBOX_CATEGORY_TYPES[category];

export const filterInboxNotificationsByCategory = ({
  notifications,
  category,
}: {
  notifications: InboxNotification[];
  category: InboxNotificationCategory;
}): InboxNotification[] => {
  const categoryTypes = getInboxCategoryTypes(category);

  if (categoryTypes === null) {
    return notifications;
  }

  return notifications.filter((notification) =>
    categoryTypes.includes(notification.type),
  );
};
