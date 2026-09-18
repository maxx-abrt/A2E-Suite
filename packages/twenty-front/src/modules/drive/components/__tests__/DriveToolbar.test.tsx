import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { DriveToolbar } from '@/drive/components/DriveToolbar';
import { DEFAULT_DRIVE_FILE_FILTERS } from '@/drive/constants';
import { type DriveFileFilters } from '@/drive/types/DriveRecord';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

// The toolbar is controlled: typing a search term only propagates correctly
// when the host feeds the new filters back in, so the harness mirrors what
// DrivePage does with its filters state.
const StatefulToolbar = ({
  onChangeFilters,
  onChangeViewMode,
  onToggleIncludeSubfolders,
  onCreateFolder,
  onUpload,
}: {
  onChangeFilters: (filters: DriveFileFilters) => void;
  onChangeViewMode: (viewMode: 'list' | 'gallery') => void;
  onToggleIncludeSubfolders: (value: boolean) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
}) => {
  const [filters, setFilters] = useState<DriveFileFilters>(
    DEFAULT_DRIVE_FILE_FILTERS,
  );

  return (
    <DriveToolbar
      viewMode="list"
      onChangeViewMode={onChangeViewMode}
      filters={filters}
      onChangeFilters={(nextFilters) => {
        setFilters(nextFilters);
        onChangeFilters(nextFilters);
      }}
      includeSubfolders={false}
      onToggleIncludeSubfolders={onToggleIncludeSubfolders}
      onCreateFolder={onCreateFolder}
      onUpload={onUpload}
    />
  );
};

const renderToolbar = () => {
  const onChangeFilters = jest.fn();
  const onChangeViewMode = jest.fn();
  const onToggleIncludeSubfolders = jest.fn();
  const onCreateFolder = jest.fn();
  const onUpload = jest.fn();

  render(
    <StatefulToolbar
      onChangeFilters={onChangeFilters}
      onChangeViewMode={onChangeViewMode}
      onToggleIncludeSubfolders={onToggleIncludeSubfolders}
      onCreateFolder={onCreateFolder}
      onUpload={onUpload}
    />,
    { wrapper: Wrapper },
  );

  return {
    onChangeFilters,
    onChangeViewMode,
    onToggleIncludeSubfolders,
    onCreateFolder,
    onUpload,
  };
};

describe('DriveToolbar', () => {
  it('updates the search filter as the user types', async () => {
    const { onChangeFilters } = renderToolbar();

    await userEvent.type(screen.getByTestId('drive-search-input'), 'facture');

    expect(onChangeFilters).toHaveBeenLastCalledWith({
      ...DEFAULT_DRIVE_FILE_FILTERS,
      search: 'facture',
    });
  });

  it('updates the type filter', async () => {
    const { onChangeFilters } = renderToolbar();

    await userEvent.selectOptions(
      screen.getByTestId('drive-filter-type'),
      'IMAGE',
    );

    expect(onChangeFilters).toHaveBeenCalledWith({
      ...DEFAULT_DRIVE_FILE_FILTERS,
      fileCategory: 'IMAGE',
    });
  });

  it('updates the source-app and object filters', async () => {
    const { onChangeFilters } = renderToolbar();

    await userEvent.selectOptions(
      screen.getByTestId('drive-filter-source-app'),
      'chat',
    );
    expect(onChangeFilters).toHaveBeenCalledWith({
      ...DEFAULT_DRIVE_FILE_FILTERS,
      sourceApp: 'chat',
    });

    await userEvent.selectOptions(
      screen.getByTestId('drive-filter-target-object'),
      'person',
    );
    expect(onChangeFilters).toHaveBeenLastCalledWith({
      ...DEFAULT_DRIVE_FILE_FILTERS,
      sourceApp: 'chat',
      targetObject: 'person',
    });
  });

  it('switches the view mode', async () => {
    const { onChangeViewMode } = renderToolbar();

    await userEvent.click(screen.getByTestId('drive-view-gallery'));

    expect(onChangeViewMode).toHaveBeenCalledWith('gallery');
  });

  it('toggles subfolder inclusion and creates a folder', async () => {
    const { onToggleIncludeSubfolders, onCreateFolder } = renderToolbar();

    await userEvent.click(screen.getByTestId('drive-include-subfolders'));
    expect(onToggleIncludeSubfolders).toHaveBeenCalledWith(true);

    await userEvent.click(screen.getByTestId('drive-create-folder'));
    expect(onCreateFolder).toHaveBeenCalled();
  });

  it('opens the keyboard upload picker', async () => {
    const { onUpload } = renderToolbar();

    await userEvent.click(screen.getByTestId('drive-upload-button'));

    expect(onUpload).toHaveBeenCalled();
  });
});
