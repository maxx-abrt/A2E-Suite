import { isDefined } from 'twenty-shared/utils';

// Pure state model for the Drive upload queue. The hook (useDriveUploadQueue)
// only wires transport and React state to these transitions, so every queue
// state the acceptance names (progress, retry, cancel, quota) is testable
// without a browser or Apollo.
export type DriveUploadTaskStatus =
  | 'pending'
  | 'uploading'
  | 'success'
  | 'error'
  | 'cancelled';

export type DriveUploadFailureKind = 'quota' | 'generic';

export type DriveUploadTask = {
  id: string;
  fileName: string;
  size: number;
  folderId: string | null;
  sourceApp: string;
  status: DriveUploadTaskStatus;
  progress: number;
  failureKind: DriveUploadFailureKind | null;
};

export type DriveUploadTaskInput = {
  id: string;
  fileName: string;
  size: number;
  folderId: string | null;
  sourceApp: string;
};

// Mirrors `settings.storage.maxDirectUploadFileSize` (1GB, server default).
// The server is authoritative; this only lets the queue fail fast with a
// specific quota message instead of a generic error after a long transfer.
export const DRIVE_MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

export const isDriveUploadOverQuota = (size: number): boolean =>
  size > DRIVE_MAX_UPLOAD_BYTES;

export const createDriveUploadTasks = (
  inputs: DriveUploadTaskInput[],
): DriveUploadTask[] =>
  inputs.map((input) => ({
    ...input,
    status: 'pending',
    progress: 0,
    failureKind: null,
  }));

const updateTask = (
  tasks: DriveUploadTask[],
  taskId: string,
  update: (task: DriveUploadTask) => DriveUploadTask,
): DriveUploadTask[] =>
  tasks.map((task) => (task.id === taskId ? update(task) : task));

export const markDriveUploadTaskUploading = (
  tasks: DriveUploadTask[],
  taskId: string,
): DriveUploadTask[] =>
  updateTask(tasks, taskId, (task) => ({
    ...task,
    status: 'uploading',
    progress: 0,
    failureKind: null,
  }));

export const setDriveUploadTaskProgress = (
  tasks: DriveUploadTask[],
  taskId: string,
  progress: number,
): DriveUploadTask[] =>
  updateTask(tasks, taskId, (task) =>
    task.status === 'uploading'
      ? { ...task, progress: Math.min(Math.max(progress, 0), 100) }
      : task,
  );

export const markDriveUploadTaskSucceeded = (
  tasks: DriveUploadTask[],
  taskId: string,
): DriveUploadTask[] =>
  updateTask(tasks, taskId, (task) => ({
    ...task,
    status: 'success',
    progress: 100,
    failureKind: null,
  }));

export const markDriveUploadTaskFailed = (
  tasks: DriveUploadTask[],
  taskId: string,
  failureKind: DriveUploadFailureKind,
): DriveUploadTask[] =>
  updateTask(tasks, taskId, (task) => ({
    ...task,
    status: 'error',
    failureKind,
  }));

export const markDriveUploadTaskCancelled = (
  tasks: DriveUploadTask[],
  taskId: string,
): DriveUploadTask[] =>
  updateTask(tasks, taskId, (task) => ({
    ...task,
    status: 'cancelled',
    failureKind: null,
  }));

export const resetDriveUploadTaskForRetry = (
  tasks: DriveUploadTask[],
  taskId: string,
): DriveUploadTask[] =>
  updateTask(tasks, taskId, (task) =>
    task.status === 'error' || task.status === 'cancelled'
      ? { ...task, status: 'pending', progress: 0, failureKind: null }
      : task,
  );

export const removeDriveUploadTask = (
  tasks: DriveUploadTask[],
  taskId: string,
): DriveUploadTask[] => tasks.filter((task) => task.id !== taskId);

export const isFinishedDriveUploadTask = (task: DriveUploadTask): boolean =>
  task.status === 'success' ||
  task.status === 'error' ||
  task.status === 'cancelled';

export const clearFinishedDriveUploadTasks = (
  tasks: DriveUploadTask[],
): DriveUploadTask[] =>
  tasks.filter((task) => !isFinishedDriveUploadTask(task));

export const isActiveDriveUploadTask = (task: DriveUploadTask): boolean =>
  task.status === 'pending' || task.status === 'uploading';

// A size over the server limit and a server `FILE_TOO_LARGE` both read as a
// quota failure; anything else is generic. The message check is a fallback for
// transports that surface the reason only as text.
export const classifyDriveUploadFailure = ({
  size,
  errorCode,
  errorMessage,
}: {
  size?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
}): DriveUploadFailureKind => {
  if (isDefined(size) && isDriveUploadOverQuota(size)) {
    return 'quota';
  }

  if (errorCode === 'FILE_TOO_LARGE') {
    return 'quota';
  }

  const normalizedMessage = (errorMessage ?? '').toLowerCase();

  return normalizedMessage.includes('maximum allowed size') ||
    normalizedMessage.includes('file_too_large') ||
    normalizedMessage.includes('too large')
    ? 'quota'
    : 'generic';
};
