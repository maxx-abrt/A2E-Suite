import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { DriveFileList } from '@/drive/components/DriveFileList';
import { type DriveFile } from '@/drive/types/DriveRecord';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const buildFile = (
  overrides: Partial<DriveFile> & Pick<DriveFile, 'id'>,
): DriveFile => ({
  name: 'report.pdf',
  folderId: null,
  starred: false,
  sourceApp: null,
  description: null,
  archivedAt: null,
  targetTaskId: null,
  targetNoteId: null,
  targetPersonId: null,
  targetCompanyId: null,
  targetOpportunityId: null,
  targetDashboardId: null,
  targetWorkflowId: null,
  ...overrides,
});

describe('DriveFileList', () => {
  it('toggles selection and star', async () => {
    const onToggleSelection = jest.fn();
    const onToggleStar = jest.fn();
    const file = buildFile({ id: 'f1' });

    render(
      <DriveFileList
        files={[file]}
        selectedFileIds={[]}
        isTrashView={false}
        onToggleSelection={onToggleSelection}
        onToggleStar={onToggleStar}
        onRename={jest.fn()}
        onArchive={jest.fn()}
        onRestore={jest.fn()}
        onPreview={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-file-select-f1'));
    await userEvent.click(screen.getByTestId('drive-file-star-f1'));

    expect(onToggleSelection).toHaveBeenCalledWith('f1');
    expect(onToggleStar).toHaveBeenCalledWith(file);
  });

  it('renames a file through the inline input', async () => {
    const onRename = jest.fn();

    render(
      <DriveFileList
        files={[buildFile({ id: 'f1' })]}
        selectedFileIds={[]}
        isTrashView={false}
        onToggleSelection={jest.fn()}
        onToggleStar={jest.fn()}
        onRename={onRename}
        onArchive={jest.fn()}
        onRestore={jest.fn()}
        onPreview={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-file-rename-f1'));

    const input = screen.getByTestId('drive-file-rename-input-f1');

    await userEvent.clear(input);
    await userEvent.type(input, 'renamed.pdf{Enter}');

    expect(onRename).toHaveBeenCalledWith('f1', 'renamed.pdf');
  });

  it('archives a live file', async () => {
    const onArchive = jest.fn();
    const file = buildFile({ id: 'f1' });

    render(
      <DriveFileList
        files={[file]}
        selectedFileIds={[]}
        isTrashView={false}
        onToggleSelection={jest.fn()}
        onToggleStar={jest.fn()}
        onRename={jest.fn()}
        onArchive={onArchive}
        onRestore={jest.fn()}
        onPreview={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-file-archive-f1'));

    expect(onArchive).toHaveBeenCalledWith(file);
  });

  it('restores a trashed file and hides live actions', async () => {
    const onRestore = jest.fn();
    const file = buildFile({
      id: 'f1',
      archivedAt: '2026-09-10T00:00:00.000Z',
    });

    render(
      <DriveFileList
        files={[file]}
        selectedFileIds={[]}
        isTrashView
        onToggleSelection={jest.fn()}
        onToggleStar={jest.fn()}
        onRename={jest.fn()}
        onArchive={jest.fn()}
        onRestore={onRestore}
        onPreview={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByTestId('drive-file-star-f1')).toBeNull();

    await userEvent.click(screen.getByTestId('drive-file-restore-f1'));

    expect(onRestore).toHaveBeenCalledWith(file);
  });
});
