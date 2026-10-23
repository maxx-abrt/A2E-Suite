import { useCompleteTask } from '@/activities/tasks/hooks/useCompleteTask';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Checkbox, CheckboxShape } from 'twenty-ui/input';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { isNonEmptyString } from '@sniptt/guards';

type TaskCompletionCheckboxProps = {
  taskId: string;
  title?: string;
  isReadOnly?: boolean;
};

export const TaskCompletionCheckbox = ({
  taskId,
  title,
  isReadOnly = false,
}: TaskCompletionCheckboxProps) => {
  const { t } = useLingui();
  const { completeTask, canCompleteTask, isCompleted } = useCompleteTask({
    id: taskId,
  });
  const { enqueueErrorSnackBar } = useSnackBar();
  const [isSaving, setIsSaving] = useState(false);
  const storedTitle = useAtomFamilySelectorValue(recordStoreFamilySelector, {
    recordId: taskId,
    fieldName: 'title',
  });
  const taskTitle =
    title || (isNonEmptyString(storedTitle) ? storedTitle : t`task`);

  const toggleCompletion = async (checked: boolean) => {
    if (isSaving || isReadOnly || !canCompleteTask) return;
    setIsSaving(true);
    try {
      await completeTask(checked);
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not update this task. Please try again.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <span
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Checkbox
        shape={CheckboxShape.Rounded}
        checked={isCompleted}
        disabled={isReadOnly || isSaving || !canCompleteTask}
        aria-label={
          isCompleted ? t`Reopen ${taskTitle}` : t`Complete ${taskTitle}`
        }
        onCheckedChange={(checked) => {
          void toggleCompletion(checked);
        }}
      />
    </span>
  );
};
