import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { DriveFolderTree } from '@/drive/components/DriveFolderTree';
import {
  type DriveFolder,
  type DriveFolderNode,
} from '@/drive/types/DriveRecord';
import { buildDriveFolderTree } from '@/drive/utils/driveFolderTree';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const buildFolder = (
  id: string,
  name: string,
  parentId: string | null = null,
): DriveFolder => ({
  id,
  name,
  icon: null,
  color: null,
  parentId,
  archivedAt: null,
});

const tree: DriveFolderNode[] = buildDriveFolderTree([
  buildFolder('a', 'Alpha'),
  buildFolder('a1', 'Alpha child', 'a'),
]);

describe('DriveFolderTree', () => {
  it('renders nested folders', () => {
    render(
      <DriveFolderTree
        nodes={tree}
        selectedFolderId={null}
        onSelectFolder={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('drive-folder-node-a')).toBeInTheDocument();
    expect(screen.getByTestId('drive-folder-node-a1')).toBeInTheDocument();
  });

  it('selects a folder on click', async () => {
    const onSelectFolder = jest.fn();

    render(
      <DriveFolderTree
        nodes={tree}
        selectedFolderId={null}
        onSelectFolder={onSelectFolder}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-folder-item-a1'));

    expect(onSelectFolder).toHaveBeenCalledWith('a1');
  });

  it('collapses a folder subtree', async () => {
    render(
      <DriveFolderTree
        nodes={tree}
        selectedFolderId={null}
        onSelectFolder={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('drive-folder-toggle-a'));

    expect(screen.queryByTestId('drive-folder-node-a1')).toBeNull();
  });

  it('shows an empty state without folders', () => {
    render(
      <DriveFolderTree
        nodes={[]}
        selectedFolderId={null}
        onSelectFolder={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('drive-folder-tree-empty')).toBeInTheDocument();
  });
});
