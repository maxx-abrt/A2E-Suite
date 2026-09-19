import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  IconAlertTriangle,
  IconArchive,
  IconAt,
  IconBell,
  IconCheckbox,
  IconEye,
  IconMessage,
} from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type InboxNotification } from '@/inbox/types/InboxNotification';
import { getInboxNotificationPreview } from '@/inbox/utils/getInboxNotificationPreview';
import { resolveNotificationDeepLink } from '@/inbox/utils/resolveNotificationDeepLink';

const StyledRow = styled.div<{ isSelected: boolean }>`
  align-items: flex-start;
  background: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.medium
      : 'transparent'};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledContent = styled.button`
  align-items: flex-start;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex: 1;
  font-family: inherit;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: 0;
  text-align: left;

  &:disabled {
    cursor: default;
  }
`;

const StyledIcon = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  padding-top: 2px;
`;

const StyledBody = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledTitle = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledUnreadDot = styled.span`
  background: ${themeCssVariables.color.blue};
  border-radius: 999px;
  height: 6px;
  width: 6px;
`;

const StyledPreview = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledTime = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  white-space: nowrap;
`;

export type InboxNotificationItemProps = {
  notification: InboxNotification;
  isSelected: boolean;
  onToggleSelection: (notificationId: string) => void;
  onOpenNotification: (notification: InboxNotification) => void;
};

export const InboxNotificationItem = ({
  notification,
  isSelected,
  onToggleSelection,
  onOpenNotification,
}: InboxNotificationItemProps) => {
  const { t } = useLingui();

  const deepLink = resolveNotificationDeepLink(notification);
  const isActionable = deepLink !== null;

  const getNotificationLabel = () => {
    switch (notification.type) {
      case 'MENTION':
        return t`You were mentioned`;
      case 'CHAT_MESSAGE':
        return t`New message`;
      case 'ASSIGNED':
        return t`Assigned to you`;
      case 'WATCHED_RECORD_CHANGED':
        return t`A watched record changed`;
      case 'INVOICE_OVERDUE':
        return t`An invoice is overdue`;
      case 'PAYMENT_RECEIVED':
        return t`A payment was received`;
      case 'BUDGET_ALERT':
        return t`A budget threshold was reached`;
      case 'SYSTEM':
        return t`System notification`;
      default:
        return t`Notification`;
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'MENTION':
        return <IconAt size={16} />;
      case 'CHAT_MESSAGE':
        return <IconMessage size={16} />;
      case 'ASSIGNED':
        return <IconCheckbox size={16} />;
      case 'WATCHED_RECORD_CHANGED':
        return <IconEye size={16} />;
      case 'INVOICE_OVERDUE':
      case 'PAYMENT_RECEIVED':
      case 'BUDGET_ALERT':
        return <IconAlertTriangle size={16} />;
      case 'SYSTEM':
        return <IconArchive size={16} />;
      default:
        return <IconBell size={16} />;
    }
  };

  const preview = getInboxNotificationPreview(notification);

  return (
    <StyledRow
      isSelected={isSelected}
      data-testid={`inbox-notification-${notification.id}`}
    >
      <Checkbox
        checked={isSelected}
        aria-label={t`Select notification`}
        onCheckedChange={() => onToggleSelection(notification.id)}
      />
      <StyledContent
        type="button"
        disabled={!isActionable}
        onClick={() => {
          if (isActionable) {
            onOpenNotification(notification);
          }
        }}
      >
        <StyledIcon>{getNotificationIcon()}</StyledIcon>
        <StyledBody>
          <StyledTitle>
            {getNotificationLabel()}
            {notification.readAt === null && <StyledUnreadDot />}
          </StyledTitle>
          {isActionable ? (
            preview !== null && <StyledPreview>{preview}</StyledPreview>
          ) : (
            <StyledPreview>
              {t`This notification has no destination`}
            </StyledPreview>
          )}
        </StyledBody>
        <StyledTime>
          {new Date(notification.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </StyledTime>
      </StyledContent>
    </StyledRow>
  );
};
