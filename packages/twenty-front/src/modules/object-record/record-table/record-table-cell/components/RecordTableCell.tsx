import { FieldFocusStaticUnfocusedProvider } from '@/object-record/record-field/ui/contexts/FieldFocusContextProvider';
import { RecordTableCellContainer } from '@/object-record/record-table/record-table-cell/components/RecordTableCellContainer';
import { RecordTableCellDisplay } from '@/object-record/record-table/record-table-cell/components/RecordTableCellDisplay';

export const RecordTableCell = () => {
  return (
    <FieldFocusStaticUnfocusedProvider>
      <RecordTableCellContainer
        nonEditModeContent={<RecordTableCellDisplay />}
      />
    </FieldFocusStaticUnfocusedProvider>
  );
};
