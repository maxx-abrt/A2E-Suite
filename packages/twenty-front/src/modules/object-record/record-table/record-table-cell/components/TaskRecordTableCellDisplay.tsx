import { TaskCompletionCheckbox } from '@/activities/tasks/components/TaskCompletionCheckbox';
import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { useRecordTableRowContextOrThrow } from '@/object-record/record-table/contexts/RecordTableRowContext';
import { isRecordTableCellsNonEditableComponentState } from '@/object-record/record-table/states/isRecordTableCellsNonEditableComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTaskTitle = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  width: 100%;

  > :last-child {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  &:has([role='checkbox'][aria-checked='true']) > :last-child {
    opacity: 0.65;
    text-decoration: line-through;
  }
`;

export const TaskRecordTableCellDisplay = () => {
  const { recordId, isRecordReadOnly } = useRecordTableRowContextOrThrow();
  const isRecordTableCellsNonEditable = useAtomComponentStateValue(
    isRecordTableCellsNonEditableComponentState,
  );

  return (
    <StyledTaskTitle>
      <TaskCompletionCheckbox
        taskId={recordId}
        isReadOnly={isRecordTableCellsNonEditable || isRecordReadOnly}
      />
      <FieldDisplay />
    </StyledTaskTitle>
  );
};
