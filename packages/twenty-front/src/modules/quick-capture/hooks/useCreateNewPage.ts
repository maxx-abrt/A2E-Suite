import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import {
  buildNewPageCreatePlan,
  DOCUMENT_OBJECT_NAME_SINGULAR,
} from '@/quick-capture/utils/newPageDocument';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { t } from '@lingui/core/macro';
import { useCallback } from 'react';

// Creates the untitled document through the native record-creation primitive
// (the host equivalent of the app's own create path) and opens it in the side
// panel, which is the document object's configured `openRecordIn`.
export const useCreateNewPage = () => {
  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
  });
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const { enqueueErrorSnackBar } = useSnackBar();

  const createNewPage = useCallback(async () => {
    const createPlan = buildNewPageCreatePlan();

    try {
      const createdRecord = await createOneRecord(createPlan.recordInput);

      openRecordInSidePanel({
        recordId: createdRecord.id,
        objectNameSingular: createPlan.objectNameSingular,
        isNewRecord: true,
        resetNavigationStack: true,
      });

      return createdRecord.id;
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not create the page. Please try again.`,
      });

      return null;
    }
  }, [createOneRecord, enqueueErrorSnackBar, openRecordInSidePanel]);

  return { createNewPage };
};
