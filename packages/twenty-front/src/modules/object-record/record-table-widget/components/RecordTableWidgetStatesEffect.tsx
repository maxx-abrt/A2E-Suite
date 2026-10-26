import { isRecordTableCellsNonEditableComponentState } from '@/object-record/record-table/states/isRecordTableCellsNonEditableComponentState';
import { isRecordTableCheckboxColumnHiddenComponentState } from '@/object-record/record-table/states/isRecordTableCheckboxColumnHiddenComponentState';
import { isRecordTableColumnHeadersReadOnlyComponentState } from '@/object-record/record-table/states/isRecordTableColumnHeadersReadOnlyComponentState';
import { isRecordTableColumnResizableComponentState } from '@/object-record/record-table/states/isRecordTableColumnResizableComponentState';
import { isRecordTableDragColumnHiddenComponentState } from '@/object-record/record-table/states/isRecordTableDragColumnHiddenComponentState';
import { isRecordTableEmptyStateHiddenComponentState } from '@/object-record/record-table/states/isRecordTableEmptyStateHiddenComponentState';
import { useStore } from 'jotai';
import { useLayoutEffect } from 'react';
import { isRecordTableCreationDisabledComponentState } from '@/object-record/record-table/states/isRecordTableCreationDisabledComponentState';

type RecordTableWidgetStatesEffectProps = {
  recordTableId: string;
  isUIEditable?: boolean;
  isPageLayoutInEditMode?: boolean;
  isEmptyStateHidden?: boolean;
  isCreationEnabled?: boolean;
};

export const RecordTableWidgetStatesEffect = ({
  recordTableId,
  isUIEditable = false,
  isPageLayoutInEditMode = false,
  isEmptyStateHidden = false,
  isCreationEnabled = true,
}: RecordTableWidgetStatesEffectProps) => {
  const store = useStore();

  useLayoutEffect(() => {
    store.set(
      isRecordTableCreationDisabledComponentState.atomFamily({
        instanceId: recordTableId,
      }),
      !isUIEditable || !isCreationEnabled,
    );
    store.set(
      isRecordTableColumnHeadersReadOnlyComponentState.atomFamily({
        instanceId: recordTableId,
      }),
      true,
    );

    store.set(
      isRecordTableDragColumnHiddenComponentState.atomFamily({
        instanceId: recordTableId,
      }),
      true,
    );

    store.set(
      isRecordTableCheckboxColumnHiddenComponentState.atomFamily({
        instanceId: recordTableId,
      }),
      true,
    );

    store.set(
      isRecordTableColumnResizableComponentState.atomFamily({
        instanceId: recordTableId,
      }),
      isPageLayoutInEditMode,
    );

    store.set(
      isRecordTableCellsNonEditableComponentState.atomFamily({
        instanceId: recordTableId,
      }),
      !isUIEditable,
    );

    store.set(
      isRecordTableEmptyStateHiddenComponentState.atomFamily({
        instanceId: recordTableId,
      }),
      isEmptyStateHidden,
    );

    return () => {
      store.set(
        isRecordTableCreationDisabledComponentState.atomFamily({
          instanceId: recordTableId,
        }),
        false,
      );
      store.set(
        isRecordTableColumnHeadersReadOnlyComponentState.atomFamily({
          instanceId: recordTableId,
        }),
        false,
      );
      store.set(
        isRecordTableDragColumnHiddenComponentState.atomFamily({
          instanceId: recordTableId,
        }),
        false,
      );
      store.set(
        isRecordTableCheckboxColumnHiddenComponentState.atomFamily({
          instanceId: recordTableId,
        }),
        false,
      );
      store.set(
        isRecordTableColumnResizableComponentState.atomFamily({
          instanceId: recordTableId,
        }),
        true,
      );
      store.set(
        isRecordTableCellsNonEditableComponentState.atomFamily({
          instanceId: recordTableId,
        }),
        false,
      );
      store.set(
        isRecordTableEmptyStateHiddenComponentState.atomFamily({
          instanceId: recordTableId,
        }),
        false,
      );
    };
  }, [
    store,
    recordTableId,
    isUIEditable,
    isPageLayoutInEditMode,
    isEmptyStateHidden,
    isCreationEnabled,
  ]);

  return null;
};
