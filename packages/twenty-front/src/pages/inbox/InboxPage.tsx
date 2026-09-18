import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { NotificationCounter } from 'twenty-ui/data-display';
import { IconInbox } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { InboxBulkActions } from '@/inbox/components/InboxBulkActions';
import { InboxFilterTabs } from '@/inbox/components/InboxFilterTabs';
import { InboxNotificationList } from '@/inbox/components/InboxNotificationList';
import { useInboxBulkActions } from '@/inbox/hooks/useInboxBulkActions';
import { useInboxLive } from '@/inbox/hooks/useInboxLive';
import { useInboxNotifications } from '@/inbox/hooks/useInboxNotifications';
import { useInboxUnreadCount } from '@/inbox/hooks/useInboxUnreadCount';
import {
  type InboxNotification,
  type InboxNotificationCategory,
} from '@/inbox/types/InboxNotification';
import { type InboxRealtimeEvent } from '@/inbox/types/InboxRealtimeEvent';
import {
  applyInboxRealtimeEventToNotifications,
  getUnreadCountFromInboxRealtimeEvent,
} from '@/inbox/utils/applyInboxRealtimeEventToNotifications';
import { filterInboxNotificationsByCategory } from '@/inbox/utils/filterInboxNotificationsByCategory';
import { groupInboxNotificationsByDay } from '@/inbox/utils/groupInboxNotificationsByDay';
import { resolveNotificationDeepLink } from '@/inbox/utils/resolveNotificationDeepLink';

const StyledInboxPage = styled.main`
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

const StyledInboxHeader = styled.header`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[3]}
    ${themeCssVariables.spacing[1]};
`;

const StyledInboxTitle = styled.h1`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[2]};
  margin: 0;
`;

const StyledStatus = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

export const InboxPage = () => {
  const { t } = useLingui();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] =
    useState<InboxNotificationCategory>('all');
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<
    string[]
  >([]);
  const [realtimeEvents, setRealtimeEvents] = useState<InboxRealtimeEvent[]>(
    [],
  );

  const {
    notifications: loadedNotifications,
    loading,
    error,
  } = useInboxNotifications();
  const { unreadCount: loadedUnreadCount } = useInboxUnreadCount();
  const { markAsRead, archive } = useInboxBulkActions();

  useInboxLive({
    onEvent: (event) =>
      setRealtimeEvents((currentEvents) => [...currentEvents, event]),
  });

  // Loaded query rows are the base; realtime events fold on top with the
  // idempotent reducer so a reconnect or a query race cannot duplicate a row.
  const notifications = useMemo(
    () =>
      realtimeEvents.reduce(
        (currentNotifications, event) =>
          applyInboxRealtimeEventToNotifications({
            notifications: currentNotifications,
            event,
          }),
        loadedNotifications,
      ),
    [loadedNotifications, realtimeEvents],
  );

  const unreadCount =
    realtimeEvents.length > 0
      ? getUnreadCountFromInboxRealtimeEvent(
          realtimeEvents[realtimeEvents.length - 1],
        )
      : loadedUnreadCount;

  const countByCategory = useMemo(
    () => ({
      all: notifications.length,
      mentions: filterInboxNotificationsByCategory({
        notifications,
        category: 'mentions',
      }).length,
      assigned: filterInboxNotificationsByCategory({
        notifications,
        category: 'assigned',
      }).length,
      watching: filterInboxNotificationsByCategory({
        notifications,
        category: 'watching',
      }).length,
    }),
    [notifications],
  );

  const filteredNotifications = useMemo(
    () =>
      filterInboxNotificationsByCategory({
        notifications,
        category: selectedCategory,
      }),
    [notifications, selectedCategory],
  );

  const dayGroups = useMemo(
    () => groupInboxNotificationsByDay(filteredNotifications),
    [filteredNotifications],
  );

  const handleToggleSelection = (notificationId: string) => {
    setSelectedNotificationIds((currentIds) =>
      currentIds.includes(notificationId)
        ? currentIds.filter((id) => id !== notificationId)
        : [...currentIds, notificationId],
    );
  };

  const resetSelectionAndRealtime = () => {
    setSelectedNotificationIds([]);
    setRealtimeEvents([]);
  };

  const handleOpenNotification = (notification: InboxNotification) => {
    const deepLink = resolveNotificationDeepLink(notification);

    if (deepLink === null) {
      return;
    }

    if (notification.readAt === null) {
      void markAsRead([notification.id]);
    }

    navigate(deepLink);
  };

  const handleMarkAsRead = async () => {
    await markAsRead(selectedNotificationIds);
    resetSelectionAndRealtime();
  };

  const handleArchive = async () => {
    await archive(selectedNotificationIds);
    resetSelectionAndRealtime();
  };

  return (
    <StyledInboxPage data-testid="inbox-page">
      <StyledInboxHeader>
        <StyledInboxTitle>
          <IconInbox size={20} />
          {t`Inbox`}
        </StyledInboxTitle>
        {unreadCount > 0 && <NotificationCounter count={unreadCount} />}
      </StyledInboxHeader>
      <InboxFilterTabs
        selectedCategory={selectedCategory}
        countByCategory={countByCategory}
        onSelectCategory={setSelectedCategory}
      />
      <InboxBulkActions
        selectedCount={selectedNotificationIds.length}
        onMarkAsRead={handleMarkAsRead}
        onArchive={handleArchive}
        onClearSelection={() => setSelectedNotificationIds([])}
      />
      {isDefined(error) && (
        <StyledStatus>{t`Could not load the inbox`}</StyledStatus>
      )}
      {loading && notifications.length === 0 ? (
        <StyledStatus>{t`Loading…`}</StyledStatus>
      ) : (
        <InboxNotificationList
          groups={dayGroups}
          selectedNotificationIds={selectedNotificationIds}
          onToggleSelection={handleToggleSelection}
          onOpenNotification={handleOpenNotification}
        />
      )}
    </StyledInboxPage>
  );
};
