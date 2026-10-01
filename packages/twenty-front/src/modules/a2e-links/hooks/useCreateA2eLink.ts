import { A2E_LINK_OBJECT_NAME_SINGULAR } from '@/a2e-links/constants/A2eLinkObjectNameSingular';
import { type A2eLinkEndpoints } from '@/a2e-links/utils/buildA2eLinkKey';
import { buildA2eLinkRecordInput } from '@/a2e-links/utils/buildA2eLinkRecordInput';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { t } from '@lingui/core/macro';
import { useCallback } from 'react';

// Persists one link through the app-owned `a2eLink` object (the a2e-links data
// path) using the native create primitive, which mints a fresh v4 id. `linkKey`
// is unique on the junction, so a repeated source/target pair is rejected by
// the server; the failure is surfaced instead of swallowed.
export const useCreateA2eLink = () => {
  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: A2E_LINK_OBJECT_NAME_SINGULAR,
  });
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();

  const createA2eLink = useCallback(
    async (endpoints: A2eLinkEndpoints): Promise<boolean> => {
      const recordInput = buildA2eLinkRecordInput(endpoints);

      if (recordInput === null) {
        enqueueErrorSnackBar({
          message: t`This object cannot be linked yet.`,
        });

        return false;
      }

      try {
        await createOneRecord(recordInput);

        enqueueSuccessSnackBar({
          message: t`Link created.`,
        });

        return true;
      } catch {
        enqueueErrorSnackBar({
          message: t`Could not create the link. It may already exist.`,
        });

        return false;
      }
    },
    [createOneRecord, enqueueErrorSnackBar, enqueueSuccessSnackBar],
  );

  return { createA2eLink };
};
