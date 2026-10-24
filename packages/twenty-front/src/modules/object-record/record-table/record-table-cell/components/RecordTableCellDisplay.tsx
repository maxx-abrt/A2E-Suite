import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { TaskRecordTableCellDisplay } from '@/object-record/record-table/record-table-cell/components/TaskRecordTableCellDisplay';
import { useContext } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';

export const RecordTableCellDisplay = () => {
  const { isLabelIdentifier, isForbidden } = useContext(FieldContext);
  const { objectMetadataItem } = useRecordTableContextOrThrow();

  return isLabelIdentifier &&
    !isForbidden &&
    objectMetadataItem.nameSingular === CoreObjectNameSingular.Task ? (
    <TaskRecordTableCellDisplay />
  ) : (
    <FieldDisplay />
  );
};
