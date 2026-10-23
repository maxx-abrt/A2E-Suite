import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { FieldFocusStaticUnfocusedProvider } from '@/object-record/record-field/ui/contexts/FieldFocusContextProvider';
import { RecordTableCellContainer } from '@/object-record/record-table/record-table-cell/components/RecordTableCellContainer';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { TaskRecordTableCellDisplay } from '@/object-record/record-table/record-table-cell/components/TaskRecordTableCellDisplay';
import { useContext } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';

export const RecordTableCell = () => {
  const { isLabelIdentifier, isForbidden } = useContext(FieldContext);
  const { objectMetadataItem } = useRecordTableContextOrThrow();
  const isTaskTitle =
    isLabelIdentifier &&
    !isForbidden &&
    objectMetadataItem.nameSingular === CoreObjectNameSingular.Task;

  return (
    <FieldFocusStaticUnfocusedProvider>
      <RecordTableCellContainer
        nonEditModeContent={
          isTaskTitle ? <TaskRecordTableCellDisplay /> : <FieldDisplay />
        }
      />
    </FieldFocusStaticUnfocusedProvider>
  );
};
