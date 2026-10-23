import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useFileUpload } from '@/file-upload/hooks/useFileUpload';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { useUploadFilesFieldFile } from '@/object-record/record-field/ui/meta-types/hooks/useUploadFilesFieldFile';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useLingui } from '@lingui/react/macro';
import { useStore } from 'jotai';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconUpload } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { v4 } from 'uuid';

type BilanCaptureActionsProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
};

export const BilanCaptureActions = ({
  objectMetadataItem,
}: BilanCaptureActionsProps) => {
  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );
  const receiptsField = objectMetadataItem.updatableFields.find(
    (field) => field.name === 'receipts',
  );
  if (
    !receiptsField ||
    !canCreateRecordsForObjectMetadataItem({
      objectMetadataItem,
      objectPermissions,
    })
  )
    return null;
  return (
    <BilanInvoiceUploadAction
      objectNameSingular={objectMetadataItem.nameSingular}
      receiptsFieldMetadataId={receiptsField.id}
    />
  );
};

type BilanInvoiceUploadActionProps = {
  objectNameSingular: string;
  receiptsFieldMetadataId: string;
};

const BilanInvoiceUploadAction = ({
  objectNameSingular,
  receiptsFieldMetadataId,
}: BilanInvoiceUploadActionProps) => {
  const { t } = useLingui();
  const store = useStore();
  const { openFileUpload } = useFileUpload();
  const { uploadFile } = useUploadFilesFieldFile();
  const { createOneRecord } = useCreateOneRecord({ objectNameSingular });
  const { updateOneRecord } = useUpdateOneRecord();
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    if (isUploading) return;
    const memberId = store.get(currentWorkspaceMemberState.atom)?.id;
    if (!isDefined(memberId)) return;
    const isCurrentMember = () =>
      store.get(currentWorkspaceMemberState.atom)?.id === memberId;
    openFileUpload({
      multiple: false,
      accept: '.pdf,.png,.jpg,.jpeg,.webp',
      onUpload: async (files) => {
        const file = files[0];
        if (!isDefined(file) || !isCurrentMember()) return;
        setIsUploading(true);
        const recordId = v4();
        let didCreate = false;
        try {
          // Capture into the native transaction first. Missing payment details
          // keep it out of the cash book until the user reviews the record.
          await createOneRecord({
            id: recordId,
            label: file.name,
            entryType: 'EXPENSE',
            entryDate: null,
            amount: null,
          });
          didCreate = true;
          if (!isCurrentMember()) return;
          const uploadedFile = await uploadFile(file, receiptsFieldMetadataId);
          if (!isCurrentMember()) return;
          await updateOneRecord({
            objectNameSingular,
            idToUpdate: recordId,
            updateOneRecordInput: { receipts: [uploadedFile] },
          });
          if (!isCurrentMember()) return;
          openRecordInSidePanel({
            objectNameSingular,
            recordId,
            isNewRecord: true,
            resetNavigationStack: true,
          });
          enqueueSuccessSnackBar({
            message: t`Invoice attached. Review the amount and payment date to update your book.`,
          });
        } catch {
          if (!isCurrentMember()) return;
          if (didCreate) {
            openRecordInSidePanel({
              objectNameSingular,
              recordId,
              isNewRecord: true,
              resetNavigationStack: true,
            });
          }
          enqueueErrorSnackBar({
            message: didCreate
              ? t`Expense created. Add the invoice from its record to finish.`
              : t`Could not finish creating the expense. Check Transactions before trying again.`,
          });
        } finally {
          setIsUploading(false);
        }
      },
    });
  };

  return (
    <Button
      title={isUploading ? t`Uploading invoice…` : t`Upload invoice`}
      ariaLabel={t`Upload invoice`}
      Icon={IconUpload}
      disabled={isUploading}
      onClick={handleUpload}
    />
  );
};
