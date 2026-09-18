import {
  DRIVE_MAX_UPLOAD_BYTES,
  classifyDriveUploadFailure,
  clearFinishedDriveUploadTasks,
  createDriveUploadTasks,
  isDriveUploadOverQuota,
  markDriveUploadTaskCancelled,
  markDriveUploadTaskFailed,
  markDriveUploadTaskSucceeded,
  markDriveUploadTaskUploading,
  removeDriveUploadTask,
  resetDriveUploadTaskForRetry,
  setDriveUploadTaskProgress,
  type DriveUploadTask,
} from '@/drive/utils/driveUploadQueue';

const buildTasks = (): DriveUploadTask[] =>
  createDriveUploadTasks([
    {
      id: 'task-1',
      fileName: 'report.pdf',
      size: 10,
      folderId: 'folder-1',
      sourceApp: 'drive',
    },
    {
      id: 'task-2',
      fileName: 'photo.png',
      size: 20,
      folderId: null,
      sourceApp: 'drive',
    },
  ]);

describe('createDriveUploadTasks', () => {
  it('starts every task pending with no progress', () => {
    expect(buildTasks()).toEqual([
      expect.objectContaining({
        id: 'task-1',
        status: 'pending',
        progress: 0,
        failureKind: null,
      }),
      expect.objectContaining({
        id: 'task-2',
        status: 'pending',
        progress: 0,
        failureKind: null,
      }),
    ]);
  });
});

describe('progress transitions', () => {
  it('tracks progress only while uploading and clamps the value', () => {
    const uploading = markDriveUploadTaskUploading(buildTasks(), 'task-1');

    expect(uploading[0].status).toBe('uploading');
    expect(uploading[1].status).toBe('pending');

    const progressed = setDriveUploadTaskProgress(uploading, 'task-1', 42);
    expect(progressed[0].progress).toBe(42);

    expect(
      setDriveUploadTaskProgress(progressed, 'task-1', 200)[0].progress,
    ).toBe(100);
    expect(
      setDriveUploadTaskProgress(progressed, 'task-1', -5)[0].progress,
    ).toBe(0);
    // The pending task ignores progress updates.
    expect(
      setDriveUploadTaskProgress(progressed, 'task-2', 50)[1].progress,
    ).toBe(0);
  });
});

describe('failure and retry', () => {
  it('records quota and generic failures distinctly', () => {
    const quota = markDriveUploadTaskFailed(buildTasks(), 'task-1', 'quota');
    const generic = markDriveUploadTaskFailed(quota, 'task-2', 'generic');

    expect(generic[0].failureKind).toBe('quota');
    expect(generic[1].failureKind).toBe('generic');
  });

  it('resets only errored or cancelled tasks for retry', () => {
    const cancelled = markDriveUploadTaskCancelled(buildTasks(), 'task-2');
    const resetBoth = resetDriveUploadTaskForRetry(cancelled, 'task-1');
    const resetOne = resetDriveUploadTaskForRetry(resetBoth, 'task-2');

    expect(resetOne[0].status).toBe('pending');
    expect(resetOne[1].status).toBe('pending');

    const succeeded = markDriveUploadTaskSucceeded(resetOne, 'task-1');
    expect(resetDriveUploadTaskForRetry(succeeded, 'task-1')[0].status).toBe(
      'success',
    );
  });
});

describe('cleanup', () => {
  it('removes a task and clears finished ones', () => {
    const succeeded = markDriveUploadTaskSucceeded(buildTasks(), 'task-1');

    expect(removeDriveUploadTask(succeeded, 'task-2')).toHaveLength(1);
    expect(clearFinishedDriveUploadTasks(succeeded)).toEqual([
      expect.objectContaining({ id: 'task-2' }),
    ]);
  });
});

describe('quota classification', () => {
  it('flags sizes over the direct-upload limit', () => {
    expect(isDriveUploadOverQuota(DRIVE_MAX_UPLOAD_BYTES)).toBe(false);
    expect(isDriveUploadOverQuota(DRIVE_MAX_UPLOAD_BYTES + 1)).toBe(true);

    expect(
      classifyDriveUploadFailure({ size: DRIVE_MAX_UPLOAD_BYTES + 1 }),
    ).toBe('quota');
  });

  it('flags the server FILE_TOO_LARGE code', () => {
    expect(classifyDriveUploadFailure({ errorCode: 'FILE_TOO_LARGE' })).toBe(
      'quota',
    );
  });

  it('flags a maximum-size server message', () => {
    expect(
      classifyDriveUploadFailure({
        errorMessage: 'The file is empty or exceeds the maximum allowed size.',
      }),
    ).toBe('quota');
  });

  it('falls back to generic for anything else', () => {
    expect(
      classifyDriveUploadFailure({ errorMessage: 'Network request failed' }),
    ).toBe('generic');
    expect(classifyDriveUploadFailure({})).toBe('generic');
  });
});
