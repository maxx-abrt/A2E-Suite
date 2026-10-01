import { DRIVE_SOURCE_APP_DRIVE } from '@/drive/constants';
import { useDriveUploadQueue } from '@/drive/hooks/useDriveUploadQueue';
import { useFileUpload } from '@/file-upload/hooks/useFileUpload';
import { useCallback } from 'react';

// Reuses the native file picker and the a2e-drive upload queue, so a Cmd+K
// upload lands in the same `attachment` identity and Drive listing as an
// upload started from the Drive page. Files go to the archive root.
export const useQuickCreateFileUpload = () => {
  const { openFileUpload } = useFileUpload();
  const { enqueueFiles } = useDriveUploadQueue();

  const openQuickCreateFileUpload = useCallback(() => {
    openFileUpload({
      multiple: true,
      onUpload: (files) => {
        void enqueueFiles(files, {
          folderId: null,
          sourceApp: DRIVE_SOURCE_APP_DRIVE,
        });
      },
    });
  }, [enqueueFiles, openFileUpload]);

  return { openQuickCreateFileUpload };
};
