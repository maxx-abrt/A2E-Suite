import { MentionRecordChip } from '@/mention/components/MentionRecordChip';
import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconCheck } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTodoTaskLine = styled.div<{ $checked: boolean }>`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  opacity: ${({ $checked }) => ($checked ? 0.6 : 1)};
  width: 100%;
`;

const StyledCheckbox = styled.button`
  align-items: center;
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  height: 14px;
  justify-content: center;
  padding: 0;
  width: 14px;
`;

const StyledContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const StyledActions = styled.div`
  display: flex;
  flex-shrink: 0;
`;

export type TodoTaskViewProps = {
  checked: boolean;
  title: string;
  taskId: string;
  isConverting?: boolean;
  onToggleChecked?: () => void;
  onConvertToTask?: () => void;
  // In the editor the inline content mounts here; stories pass no ref and the
  // plain title is rendered instead.
  contentRef?: (element: HTMLElement | null) => void;
};

export const TodoTaskView = ({
  checked,
  title,
  taskId,
  isConverting = false,
  onToggleChecked,
  onConvertToTask,
  contentRef,
}: TodoTaskViewProps) => {
  const hasTask = isNonEmptyString(taskId);

  return (
    <StyledTodoTaskLine $checked={checked}>
      <StyledCheckbox
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={t`Toggle to-do`}
        onClick={onToggleChecked}
      >
        {checked ? <IconCheck size={10} /> : null}
      </StyledCheckbox>
      <StyledContent ref={contentRef}>
        {isDefined(contentRef) ? null : title}
      </StyledContent>
      {hasTask ? (
        <MentionRecordChip
          recordId={taskId}
          objectNameSingular={CoreObjectNameSingular.Task}
          label={title}
          imageUrl=""
        />
      ) : (
        <StyledActions>
          <Button
            title={t`Convert to task`}
            size="small"
            disabled={isConverting || title.length === 0}
            onClick={onConvertToTask}
          />
        </StyledActions>
      )}
    </StyledTodoTaskLine>
  );
};
