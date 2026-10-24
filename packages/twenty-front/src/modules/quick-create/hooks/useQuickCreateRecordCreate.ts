import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { type QuickCreateCommandId } from '@/quick-create/constants/QuickCreateCommandIds';
import { buildQuickCreateRecordInput } from '@/quick-create/utils/buildQuickCreateRecordInput';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { t } from '@lingui/core/macro';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';

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

  const createQuickCreateRecord = useCallback(
    async (
      title?: string,
    ): Promise<{
      id: string;
    } | null> => {
      try {
        const createdRecord: ObjectRecord = await createOneRecord(
          buildQuickCreateRecordInput({ commandId, at: new Date(), title }),
        );

        if (!isDefined(title)) {
          openRecordInSidePanel({
            recordId: createdRecord.id,
            objectNameSingular,
            isNewRecord: true,
            resetNavigationStack: true,
          });
        }

        return { id: createdRecord.id };
      } catch (error) {
        if (isDefined(title)) throw error;
        enqueueErrorSnackBar({
          message: t`Could not create the record. Please try again.`,
        });

        return null;
      }
    },
    [
      commandId,
      createOneRecord,
      enqueueErrorSnackBar,
      objectNameSingular,
      openRecordInSidePanel,
    ],
  );

  return { createQuickCreateRecord };
};
