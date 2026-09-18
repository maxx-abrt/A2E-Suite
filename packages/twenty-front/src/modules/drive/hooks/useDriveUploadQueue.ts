import { useCallback, useMemo, useState } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { v4 } from 'uuid';
import { FieldMetadataType, FileFolder } from '~/generated-metadata/graphql';

import { useDirectFileUpload } from '@/file/hooks/useDirectFileUpload';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import {
  classifyDriveUploadFailure,
  type DriveUploadTask,
  createDriveUploadTasks,
  clearFinishedDriveUploadTasks,
  markDriveUploadTaskCancelled,
  markDriveUploadTaskFailed,
  markDriveUploadTaskSucceeded,
  markDriveUploadTaskUploading,
  removeDriveUploadTask,
  resetDriveUploadTaskForRetry,
  setDriveUploadTaskProgress,
  isDriveUploadOverQuota,
} from '@/drive/utils/driveUploadQueue';

type DriveUploadContext = {
  folderId: string | null;
  sourceApp: string;
};

const readErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const graphQLError = (
    error as { graphQLErrors?: { extensions?: { code?: string } }[] }
  ).graphQLErrors?.[0];

  return graphQLError?.extensions?.code ?? null;
};

const readErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// The Drive upload queue. Files are uploaded through the shared direct-upload
// primitive into the `attachment` object extended by a2e-drive, so an upload
// from Drive lands in the same file identity the Files field and chat use. Only
// transport + React state live here; every state transition is in
// `driveUploadQueue.ts`.
export const useDriveUploadQueue = ({
  onUploaded,
}: {
  onUploaded?: () => void;
} = {}) => {
  const { uploadFile } = useDirectFileUpload();

  const { objectMetadataItem: attachmentMetadata } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.Attachment,
  });

  const filesFieldMetadataId = attachmentMetadata.fields.find(
    (field) => field.type === FieldMetadataType.FILES && field.name === 'file',
  )?.id;

  const { createOneRecord: createAttachment } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.Attachment,
  });

  const [tasks, setTasks] = useState<DriveUploadTask[]>([]);

  // Mutable per-task resources, not render state: the raw File objects (never
  // rendered) and the abort handles. Kept in stable containers so a re-render
  // cannot drop an in-flight upload.
  const filesByTaskId = useMemo(() => new Map<string, File>(), []);
  const abortControllersByTaskId = useMemo(
    () => new Map<string, AbortController>(),
    [],
  );

  const processTask = useCallback(
    async (task: DriveUploadTask) => {
      const file = filesByTaskId.get(task.id);

      if (!isDefined(file)) {
        setTasks((currentTasks) =>
          markDriveUploadTaskFailed(currentTasks, task.id, 'generic'),
        );
        return;
      }

      setTasks((currentTasks) =>
        markDriveUploadTaskUploading(currentTasks, task.id),
      );

      const controller = new AbortController();
      abortControllersByTaskId.set(task.id, controller);

      try {
        if (isDriveUploadOverQuota(file.size)) {
          setTasks((currentTasks) =>
            markDriveUploadTaskFailed(currentTasks, task.id, 'quota'),
          );
          return;
        }

        const uploadedFile = await uploadFile(file, {
          fileFolder: FileFolder.FilesField,
          fieldMetadataId: filesFieldMetadataId,
          signal: controller.signal,
          onProgress: (progress) =>
            setTasks((currentTasks) =>
              setDriveUploadTaskProgress(currentTasks, task.id, progress),
            ),
        });

        await createAttachment({
          name: file.name,
          folderId: task.folderId,
          sourceApp: task.sourceApp,
          file: [{ fileId: uploadedFile.id, label: file.name }],
        });

        setTasks((currentTasks) =>
          markDriveUploadTaskSucceeded(currentTasks, task.id),
        );
        filesByTaskId.delete(task.id);
        onUploaded?.();
      } catch (error) {
        if (controller.signal.aborted) {
          setTasks((currentTasks) =>
            markDriveUploadTaskCancelled(currentTasks, task.id),
          );
          return;
        }

        setTasks((currentTasks) =>
          markDriveUploadTaskFailed(
            currentTasks,
            task.id,
            classifyDriveUploadFailure({
              size: file.size,
              errorCode: readErrorCode(error),
              errorMessage: readErrorMessage(error),
            }),
          ),
        );
      } finally {
        abortControllersByTaskId.delete(task.id);
      }
    },
    [
      abortControllersByTaskId,
      createAttachment,
      filesByTaskId,
      filesFieldMetadataId,
      onUploaded,
      uploadFile,
    ],
  );

  const enqueueFiles = useCallback(
    async (files: File[], context: DriveUploadContext) => {
      if (files.length === 0) {
        return;
      }

      const inputs = files.map((file) => {
        const id = v4();
        filesByTaskId.set(id, file);

        return {
          id,
          fileName: file.name,
          size: file.size,
          folderId: context.folderId,
          sourceApp: context.sourceApp,
        };
      });

      setTasks((currentTasks) => [
        ...currentTasks,
        ...createDriveUploadTasks(inputs),
      ]);

      for (const input of inputs) {
        await processTask({
          ...input,
          status: 'pending',
          progress: 0,
          failureKind: null,
        });
      }
    },
    [filesByTaskId, processTask],
  );

  const retryTask = useCallback(
    (task: DriveUploadTask) => {
      setTasks((currentTasks) =>
        resetDriveUploadTaskForRetry(currentTasks, task.id),
      );
      void processTask({
        ...task,
        status: 'pending',
        progress: 0,
        failureKind: null,
      });
    },
    [processTask],
  );

  const cancelTask = useCallback(
    (taskId: string) => {
      abortControllersByTaskId.get(taskId)?.abort();
    },
    [abortControllersByTaskId],
  );

  const dismissTask = useCallback(
    (taskId: string) => {
      filesByTaskId.delete(taskId);
      abortControllersByTaskId.delete(taskId);
      setTasks((currentTasks) => removeDriveUploadTask(currentTasks, taskId));
    },
    [abortControllersByTaskId, filesByTaskId],
  );

  const clearFinishedTasks = useCallback(() => {
    setTasks((currentTasks) => clearFinishedDriveUploadTasks(currentTasks));
  }, []);

  return {
    tasks,
    enqueueFiles,
    retryTask,
    cancelTask,
    dismissTask,
    clearFinishedTasks,
  };
};
