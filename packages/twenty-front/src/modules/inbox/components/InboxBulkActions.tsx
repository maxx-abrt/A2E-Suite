import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBulkActions = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  margin: 0 ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledSelectionCount = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  flex: 1;
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledAction = styled.button`
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;

export type InboxBulkActionsProps = {
  selectedCount: number;
  onMarkAsRead: () => void;
  onArchive: () => void;
  onClearSelection: () => void;
};

export const InboxBulkActions = ({
  selectedCount,
  onMarkAsRead,
  onArchive,
  onClearSelection,
}: InboxBulkActionsProps) => {
  const { t } = useLingui();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <StyledBulkActions data-testid="inbox-bulk-actions">
      <StyledSelectionCount>
        {t`${selectedCount} selected`}
      </StyledSelectionCount>
      <StyledAction type="button" onClick={onMarkAsRead}>
        {t`Mark as read`}
      </StyledAction>
      <StyledAction type="button" onClick={onArchive}>
        {t`Archive`}
      </StyledAction>
      <StyledAction type="button" onClick={onClearSelection}>
        {t`Clear`}
      </StyledAction>
    </StyledBulkActions>
  );
};
