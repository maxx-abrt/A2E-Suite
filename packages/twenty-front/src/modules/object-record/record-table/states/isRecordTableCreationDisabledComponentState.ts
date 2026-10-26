import { RecordTableComponentInstanceContext } from '@/object-record/record-table/states/context/RecordTableComponentInstanceContext';
import { createAtomComponentState } from '@/ui/utilities/state/jotai/utils/createAtomComponentState';

export const isRecordTableCreationDisabledComponentState =
  createAtomComponentState<boolean>({
    key: 'isRecordTableCreationDisabledComponentState',
    defaultValue: false,
    componentInstanceContext: RecordTableComponentInstanceContext,
  });
