import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconAlertTriangle, IconArchive, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type DriveBulkFailure } from '@/drive/utils/driveBulkOperations';

const StyledNotice = styled.div`
  align-items: flex-start;
  background: ${themeCssVariables.background.transparent.light};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledSummary = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledFailureList = styled.ul`
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 2px;
  list-style: none;
  margin: 0;
  max-height: 96px;
  overflow-y: auto;
  padding: 0;
`;

const StyledFailureName = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledFailureReason = styled.span`
  margin-left: ${themeCssVariables.spacing[1]};
`;

const StyledButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.medium};
  }
`;

export type DriveBulkResultNoticeProps = {
  completedCount: number;
  failures: DriveBulkFailure[];
  onUndo?: () => void;
  onDismiss: () => void;
};

// Renders the outcome of the last bulk action. A partial batch is the normal
// case, so failures are listed by name with their reason and are never folded
// into a single generic error. Undo is only passed in while the trash window
// still allows a restore.
export const DriveBulkResultNotice = ({
  completedCount,
  failures,
  onUndo,
  onDismiss,
}: DriveBulkResultNoticeProps) => {
  const { t } = useLingui();

  if (completedCount === 0 && failures.length === 0) {
    return null;
  }

  return (
    <StyledNotice role="status" data-testid="drive-bulk-result">
      <IconAlertTriangle size={16} />
      <StyledContent>
        <StyledSummary data-testid="drive-bulk-result-summary">
          {t`Completed`}: {completedCount} · {t`Failed`}: {failures.length}
        </StyledSummary>

        {failures.length > 0 && (
          <StyledFailureList data-testid="drive-bulk-failures">
            {failures.map((failure) => (
              <li key={failure.id}>
                <StyledFailureName
                  data-testid={`drive-bulk-failure-${failure.id}`}
                >
                  {failure.label}
                </StyledFailureName>
                <StyledFailureReason>
                  {failure.reason === 'download-url-missing'
                    ? t`No download link available`
                    : (failure.detail ?? t`Could not be completed`)}
                </StyledFailureReason>
              </li>
            ))}
          </StyledFailureList>
        )}
      </StyledContent>

      {isDefined(onUndo) && (
        <StyledButton
          type="button"
          data-testid="drive-bulk-undo"
          onClick={onUndo}
        >
          <IconArchive size={16} />
          {t`Undo`}
        </StyledButton>
      )}

      <StyledButton
        type="button"
        aria-label={t`Dismiss`}
        data-testid="drive-bulk-dismiss"
        onClick={onDismiss}
      >
        <IconX size={16} />
      </StyledButton>
    </StyledNotice>
  );
};
