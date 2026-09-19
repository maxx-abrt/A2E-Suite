import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { DriveBulkActions } from '@/drive/components/DriveBulkActions';
import { type DriveFolder } from '@/drive/types/DriveRecord';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const buildFolder = (id: string, name: string): DriveFolder => ({
  id,
  name,
  icon: null,
  color: null,
  parentId: null,
  archivedAt: null,
});

describe('DriveBulkActions', () => {
  it('renders nothing without a selection', () => {
    render(
      <DriveBulkActions
        selectedCount={0}
        moveTargetFolders={[]}
        isTrashView={false}
        onMove={jest.fn()}
        onArchive={jest.fn()}
        onRestore={jest.fn()}
        onClearSelection={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByTestId('drive-bulk-actions')).toBeNull();
  });

  it('moves the selection into the chosen folder', async () => {
    const onMove = jest.fn();

    render(
      <DriveBulkActions
        selectedCount={2}
        moveTargetFolders={[buildFolder('a', 'Alpha')]}
        isTrashView={false}
        onMove={onMove}
        onArchive={jest.fn()}
        onRestore={jest.fn()}
        onClearSelection={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('drive-bulk-actions')).toHaveTextContent(
      '2 selected',
    );

    await userEvent.selectOptions(
      screen.getByTestId('drive-bulk-move-target'),
      'a',
    );
    await userEvent.click(screen.getByTestId('drive-bulk-move'));

    expect(onMove).toHaveBeenCalledWith('a');
  });

  it('archives and clears a live selection', async () => {
    const onArchive = jest.fn();
    const onClearSelection = jest.fn();

    render(
      <DriveBulkActions
        selectedCount={1}
        moveTargetFolders={[]}
        isTrashView={false}
        onMove={jest.fn()}
        onArchive={onArchive}
        onRestore={jest.fn()}
        onClearSelection={onClearSelection}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-bulk-archive'));
    await userEvent.click(screen.getByTestId('drive-bulk-clear'));

    expect(onArchive).toHaveBeenCalled();
    expect(onClearSelection).toHaveBeenCalled();
  });

  it('restores a trashed selection', async () => {
    const onRestore = jest.fn();

    render(
      <DriveBulkActions
        selectedCount={1}
        moveTargetFolders={[]}
        isTrashView
        onMove={jest.fn()}
        onArchive={jest.fn()}
        onRestore={onRestore}
        onClearSelection={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByTestId('drive-bulk-archive')).toBeNull();

    await userEvent.click(screen.getByTestId('drive-bulk-restore'));

    expect(onRestore).toHaveBeenCalled();
  });

  it('exposes an accessible select-all as the range-selection alternative', async () => {
    const onSelectAll = jest.fn();

    render(
      <DriveBulkActions
        selectedCount={0}
        moveTargetFolders={[]}
        isTrashView={false}
        totalFileCount={4}
        allSelected={false}
        onSelectAll={onSelectAll}
        onMove={jest.fn()}
        onArchive={jest.fn()}
        onRestore={jest.fn()}
        onClearSelection={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-bulk-select-all'));

    expect(onSelectAll).toHaveBeenCalled();
    expect(screen.getByTestId('drive-bulk-actions')).toBeInTheDocument();
  });

  it('downloads the selection when a download handler is supplied', async () => {
    const onDownload = jest.fn();

    render(
      <DriveBulkActions
        selectedCount={1}
        moveTargetFolders={[]}
        isTrashView={false}
        totalFileCount={1}
        onDownload={onDownload}
        onMove={jest.fn()}
        onArchive={jest.fn()}
        onRestore={jest.fn()}
        onClearSelection={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-bulk-download'));

    expect(onDownload).toHaveBeenCalled();
  });
});
