import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { InboxNotificationItem } from '@/inbox/components/InboxNotificationItem';
import { type InboxNotification } from '@/inbox/types/InboxNotification';
import {
  getInboxDayKey,
  getYesterdayDate,
  type InboxNotificationDayGroup,
} from '@/inbox/utils/groupInboxNotificationsByDay';

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  overflow-y: auto;
  padding: 0 ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledDayGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledDayLabel = styled.h3`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-transform: uppercase;
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const toDateFromDayKey = (dayKey: string): Date => {
  const [year, month, day] = dayKey.split('-').map(Number);

  return new Date(year, month - 1, day);
};

export type InboxNotificationListProps = {
  groups: InboxNotificationDayGroup[];
  selectedNotificationIds: string[];
  onToggleSelection: (notificationId: string) => void;
  onOpenNotification: (notification: InboxNotification) => void;
};

export const InboxNotificationList = ({
  groups,
  selectedNotificationIds,
  onToggleSelection,
  onOpenNotification,
}: InboxNotificationListProps) => {
  const { t } = useLingui();

  const todayDayKey = getInboxDayKey(new Date());
  const yesterdayDayKey = getInboxDayKey(getYesterdayDate(new Date()));

  const getDayLabel = (dayKey: string): string => {
    if (dayKey === todayDayKey) {
      return t`Today`;
    }

    if (dayKey === yesterdayDayKey) {
      return t`Yesterday`;
    }

    return toDateFromDayKey(dayKey).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (groups.length === 0) {
    return (
      <StyledEmptyState data-testid="inbox-empty-state">
        {t`Your inbox is empty`}
      </StyledEmptyState>
    );
  }

  return (
    <StyledList data-testid="inbox-notification-list">
      {groups.map((group) => (
        <StyledDayGroup
          key={group.dayKey}
          data-testid={`inbox-day-${group.dayKey}`}
        >
          <StyledDayLabel>{getDayLabel(group.dayKey)}</StyledDayLabel>
          {group.notifications.map((notification) => (
            <InboxNotificationItem
              key={notification.id}
              notification={notification}
              isSelected={selectedNotificationIds.includes(notification.id)}
              onToggleSelection={onToggleSelection}
              onOpenNotification={onOpenNotification}
            />
          ))}
        </StyledDayGroup>
      ))}
    </StyledList>
  );
};
