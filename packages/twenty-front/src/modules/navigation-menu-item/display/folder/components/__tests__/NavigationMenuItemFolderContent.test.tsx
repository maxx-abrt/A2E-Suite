import { NavigationMenuItemFolderContent } from '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderContent';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => [
    {
      id: 'document-object',
      namePlural: 'documents',
      nameSingular: 'document',
      labelPlural: 'Pages',
    },
  ],
}));
jest.mock(
  '@/navigation-menu-item/common/hooks/useDeleteManyNavigationMenuItems',
  () => ({
    useDeleteManyNavigationMenuItems: () => ({
      deleteManyNavigationMenuItems: jest.fn(),
    }),
  }),
);
jest.mock(
  '@/navigation-menu-item/display/components/NavigationMenuItemIcon',
  () => ({ NavigationMenuItemIcon: () => null }),
);
jest.mock(
  '@/navigation-menu-item/display/dnd/components/NavigationMenuItemSortableItem',
  () => ({
    NavigationMenuItemSortableItem: () => {
      throw new Error('Read-only app links must not activate drag handling');
    },
  }),
);
jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem',
  () => ({
    NavigationDrawerItem: ({
      label,
      to,
      active,
      onClick,
    }: {
      label: string;
      to?: string;
      active: boolean;
      onClick?: () => void;
    }) =>
      to ? (
        <Link to={to} aria-current={active ? 'page' : undefined}>
          {label}
        </Link>
      ) : (
        <button onClick={onClick}>{label}</button>
      ),
  }),
);
jest.mock(
  '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderLayout',
  () => ({
    NavigationMenuItemFolderLayout: ({
      header,
      isOpen,
      children,
    }: {
      header: React.ReactNode;
      isOpen: boolean;
      children: React.ReactNode;
    }) => (
      <div>
        {header}
        {isOpen ? <div data-testid="folder-items">{children}</div> : null}
      </div>
    ),
  }),
);
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomState', () => ({
  useAtomState: () => {
    const { useState } = jest.requireActual('react') as {
      useState: <Value>(
        initialValue: Value,
      ) => [Value, (nextValue: Value) => void];
    };
    // In-memory list state so the collapsible header can really toggle.
    return useState<string[]>([]);
  },
}));
const Location = () => <output>{useLocation().pathname}</output>;
const item = {
  id: 'documents',
  type: 'OBJECT',
  name: 'Pages',
  targetObjectMetadataId: 'document-object',
  position: 0,
} as NavigationMenuItem;
it('opens Pages from a different table without enabling edit or drag controls', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/objects/projects']}>
      <NavigationMenuItemFolderContent
        folderId="bureau"
        folderName="Bureau"
        navigationMenuItems={[item]}
        hideBackButton
      />
      <Location />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('link', { name: /Pages/ }));
  expect(screen.getByText('/objects/documents')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('marks the current native table and full-page records as active', () => {
  render(
    <MemoryRouter initialEntries={['/object/document/page-id']}>
      <NavigationMenuItemFolderContent
        folderId="bureau"
        folderName="Bureau"
        navigationMenuItems={[item]}
        hideBackButton
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: /Pages/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

it('keeps shortcuts folded behind a collapsible header until opened', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/objects/projects']}>
      <NavigationMenuItemFolderContent
        folderId="bureau"
        folderName="Bureau"
        navigationMenuItems={[item]}
        hideBackButton
        collapsibleSectionLabel="Shortcuts"
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole('button', { name: 'Shortcuts' })).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Shortcuts' }));

  expect(screen.getByRole('link', { name: /Pages/ })).toBeInTheDocument();
});

it('unfolds the shortcut group on its own when one of the shortcuts is active', () => {
  render(
    <MemoryRouter initialEntries={['/objects/documents']}>
      <NavigationMenuItemFolderContent
        folderId="bureau"
        folderName="Bureau"
        navigationMenuItems={[item]}
        hideBackButton
        collapsibleSectionLabel="Shortcuts"
      />
    </MemoryRouter>,
  );

  expect(screen.getByTestId('folder-items')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Pages/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

it('lists shortcuts inline when no collapsible section is requested', () => {
  render(
    <MemoryRouter initialEntries={['/objects/projects']}>
      <NavigationMenuItemFolderContent
        folderId="bureau"
        folderName="Bureau"
        navigationMenuItems={[item]}
        hideBackButton
      />
      <Location />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: /Pages/ })).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
