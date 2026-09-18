import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import {
  IconAlertTriangle,
  IconCheck,
  IconRefresh,
  IconX,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  isActiveDriveUploadTask,
  isFinishedDriveUploadTask,
  type DriveUploadTask,
} from '@/drive/utils/driveUploadQueue';

// The upload tray is presentational: every state it renders comes from the
// pure queue model, so progress/retry/cancel/quota are testable without a
// browser upload.
const StyledPanel = styled.section`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  margin: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]} 0;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const StyledTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledTasks = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledTask = styled.li`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledProgress = styled.progress`
  height: 4px;
  width: 100px;
`;

const StyledStatus = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  max-width: 320px;
`;

const StyledQuotaStatus = styled.span`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.xs};
  max-width: 320px;
`;

const StyledIconButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  padding: ${themeCssVariables.spacing[1]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

export type DriveUploadQueuePanelProps = {
  tasks: DriveUploadTask[];
  onRetry: (task: DriveUploadTask) => void;
  onCancel: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
  onClearFinished: () => void;
};

export const DriveUploadQueuePanel = ({
  tasks,
  onRetry,
  onCancel,
  onDismiss,
  onClearFinished,
}: DriveUploadQueuePanelProps) => {
  const { t } = useLingui();

  if (tasks.length === 0) {
    return null;
  }

  const hasFinishedTasks = tasks.some(isFinishedDriveUploadTask);

  return (
    <StyledPanel data-testid="drive-upload-queue" aria-live="polite">
      <StyledHeader>
        <StyledTitle>{t`Uploads`}</StyledTitle>
        {hasFinishedTasks && (
          <StyledIconButton
            type="button"
            aria-label={t`Clear finished uploads`}
            data-testid="drive-upload-clear-finished"
            onClick={onClearFinished}
          >
            <IconX size={16} />
          </StyledIconButton>
        )}
      </StyledHeader>
      <StyledTasks>
        {tasks.map((task) => (
          <StyledTask
            key={task.id}
            data-testid={`drive-upload-task-${task.id}`}
          >
            <StyledName>{task.fileName}</StyledName>

            {task.status === 'uploading' || task.status === 'pending' ? (
              <StyledProgress
                max={100}
                value={task.progress}
                aria-label={t`Upload progress for ${task.fileName}`}
                data-testid={`drive-upload-progress-${task.id}`}
              />
            ) : null}

            {task.status === 'success' && (
              <StyledStatus data-testid={`drive-upload-success-${task.id}`}>
                <IconCheck size={16} /> {t`Uploaded`}
              </StyledStatus>
            )}

            {task.status === 'error' && task.failureKind === 'quota' && (
              <StyledQuotaStatus data-testid={`drive-upload-quota-${task.id}`}>
                <IconAlertTriangle size={16} />{' '}
                {t`File exceeds the maximum allowed size`}
              </StyledQuotaStatus>
            )}

            {task.status === 'error' && task.failureKind !== 'quota' && (
              <StyledStatus data-testid={`drive-upload-error-${task.id}`}>
                <IconAlertTriangle size={16} /> {t`Upload failed`}
              </StyledStatus>
            )}

            {task.status === 'cancelled' && (
              <StyledStatus data-testid={`drive-upload-cancelled-${task.id}`}>
                {t`Upload cancelled`}
              </StyledStatus>
            )}

            {isActiveDriveUploadTask(task) && (
              <StyledIconButton
                type="button"
                aria-label={t`Cancel upload of ${task.fileName}`}
                data-testid={`drive-upload-cancel-${task.id}`}
                onClick={() => onCancel(task.id)}
              >
                <IconX size={16} />
              </StyledIconButton>
            )}

            {(task.status === 'error' || task.status === 'cancelled') && (
              <StyledIconButton
                type="button"
                aria-label={t`Retry upload of ${task.fileName}`}
                data-testid={`drive-upload-retry-${task.id}`}
                onClick={() => onRetry(task)}
              >
                <IconRefresh size={16} />
              </StyledIconButton>
            )}

            {isFinishedDriveUploadTask(task) && (
              <StyledIconButton
                type="button"
                aria-label={t`Dismiss upload of ${task.fileName}`}
                data-testid={`drive-upload-dismiss-${task.id}`}
                onClick={() => onDismiss(task.id)}
              >
                <IconX size={16} />
              </StyledIconButton>
            )}
          </StyledTask>
        ))}
      </StyledTasks>
    </StyledPanel>
  );
};
