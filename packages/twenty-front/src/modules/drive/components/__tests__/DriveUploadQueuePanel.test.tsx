import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { DriveUploadQueuePanel } from '@/drive/components/DriveUploadQueuePanel';
import {
  createDriveUploadTasks,
  markDriveUploadTaskCancelled,
  markDriveUploadTaskFailed,
  markDriveUploadTaskSucceeded,
  setDriveUploadTaskProgress,
  type DriveUploadTask,
} from '@/drive/utils/driveUploadQueue';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

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
      fileName: 'huge.zip',
      size: 999,
      folderId: null,
      sourceApp: 'drive',
    },
  ]);

const renderPanel = (tasks: DriveUploadTask[]) => {
  const onRetry = jest.fn();
  const onCancel = jest.fn();
  const onDismiss = jest.fn();
  const onClearFinished = jest.fn();

  render(
    <DriveUploadQueuePanel
      tasks={tasks}
      onRetry={onRetry}
      onCancel={onCancel}
      onDismiss={onDismiss}
      onClearFinished={onClearFinished}
    />,
    { wrapper: Wrapper },
  );

  return { onRetry, onCancel, onDismiss, onClearFinished };
};

describe('DriveUploadQueuePanel', () => {
  it('renders nothing when the queue is empty', () => {
    renderPanel([]);

    expect(screen.queryByTestId('drive-upload-queue')).toBeNull();
  });

  it('shows per-file progress and lets the user cancel', async () => {
    const uploading = {
      ...buildTasks()[0],
      status: 'uploading' as const,
      progress: 40,
    };
    const { onCancel } = renderPanel([uploading]);

    const progress = screen.getByTestId('drive-upload-progress-task-1');

    expect(progress).toHaveAccessibleName(/report\.pdf/);
    expect(progress).toHaveValue(40);

    await userEvent.click(screen.getByTestId('drive-upload-cancel-task-1'));

    expect(onCancel).toHaveBeenCalledWith('task-1');
  });

  it('distinguishes a quota failure and offers retry', async () => {
    const quota = markDriveUploadTaskFailed(buildTasks(), 'task-2', 'quota')[1];
    const { onRetry } = renderPanel([quota]);

    expect(screen.getByTestId('drive-upload-quota-task-2')).toBeInTheDocument();
    expect(screen.queryByTestId('drive-upload-error-task-2')).toBeNull();

    await userEvent.click(screen.getByTestId('drive-upload-retry-task-2'));

    expect(onRetry).toHaveBeenCalledWith(quota);
  });

  it('shows a generic failure separately from quota', () => {
    const generic = markDriveUploadTaskFailed(
      buildTasks(),
      'task-1',
      'generic',
    )[0];
    renderPanel([generic]);

    expect(screen.getByTestId('drive-upload-error-task-1')).toBeInTheDocument();
    expect(screen.queryByTestId('drive-upload-quota-task-1')).toBeNull();
  });

  it('shows cancelled state with retry', async () => {
    const cancelled = markDriveUploadTaskCancelled(buildTasks(), 'task-1')[0];
    const { onRetry } = renderPanel([cancelled]);

    expect(
      screen.getByTestId('drive-upload-cancelled-task-1'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('drive-upload-retry-task-1'));

    expect(onRetry).toHaveBeenCalledWith(cancelled);
  });

  it('shows success, allows dismissal and clearing finished uploads', async () => {
    const succeeded = markDriveUploadTaskSucceeded(buildTasks(), 'task-1')[0];
    const { onDismiss, onClearFinished } = renderPanel([succeeded]);

    expect(
      screen.getByTestId('drive-upload-success-task-1'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('drive-upload-dismiss-task-1'));
    expect(onDismiss).toHaveBeenCalledWith('task-1');

    await userEvent.click(screen.getByTestId('drive-upload-clear-finished'));
    expect(onClearFinished).toHaveBeenCalled();
  });

  it('keeps updating the progress value between renders', () => {
    const uploading = setDriveUploadTaskProgress(
      [{ ...buildTasks()[0], status: 'uploading' }],
      'task-1',
      75,
    );

    renderPanel(uploading);

    expect(screen.getByTestId('drive-upload-progress-task-1')).toHaveValue(75);
  });
});
