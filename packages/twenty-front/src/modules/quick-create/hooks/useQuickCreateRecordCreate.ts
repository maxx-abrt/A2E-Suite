import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { type QuickCreateCommandId } from '@/quick-create/constants/QuickCreateCommandIds';
import { buildQuickCreateRecordInput } from '@/quick-create/utils/buildQuickCreateRecordInput';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { t } from '@lingui/core/macro';
import { useCallback } from 'react';

// One create path for every "Create…" record entry: the native
// `useCreateOneRecord` primitive (no new mutation) plus the existing
// side-panel-open helper, so the created item lands where its object says. The
// caller layers the optional a2eLink pre-link on top of the returned id.
export const useQuickCreateRecordCreate = ({
  commandId,
  objectNameSingular,
}: {
  commandId: QuickCreateCommandId;
  objectNameSingular: string;
}) => {
  const { createOneRecord } = useCreateOneRecord({ objectNameSingular });
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const { enqueueErrorSnackBar } = useSnackBar();

  const createQuickCreateRecord = useCallback(async (): Promise<{
    id: string;
  } | null> => {
    try {
      const createdRecord: ObjectRecord = await createOneRecord(
        buildQuickCreateRecordInput({ commandId, at: new Date() }),
      );

      openRecordInSidePanel({
        recordId: createdRecord.id,
        objectNameSingular,
        isNewRecord: true,
        resetNavigationStack: true,
      });

      return { id: createdRecord.id };
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not create the record. Please try again.`,
      });

      return null;
    }
  }, [
    commandId,
    createOneRecord,
    enqueueErrorSnackBar,
    objectNameSingular,
    openRecordInSidePanel,
  ]);

  return { createQuickCreateRecord };
};
